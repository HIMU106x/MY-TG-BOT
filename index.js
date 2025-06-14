// index.js

require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs-extra");
const glob = require("fast-glob");
const winston = require("winston");
const i18next = require("i18next");
const path = require("path");
const moment = require("moment-timezone");

(async () => {
  // Dynamic imports for ESM-only modules
  const chalkModule = await import("chalk");
  const oraModule = await import("ora");
  const chalk = chalkModule.default;
  const ora = oraModule.default;

  // Load config
  const config = require("./config.json");
  const { prefix, admins, language, logGroup } = config.bot;

  // Setup logger
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] ${level}: ${message}`;
      })
    ),
    transports: [new winston.transports.Console()],
  });

  // Initialize i18next
  await i18next.init({
    lng: language,
    fallbackLng: "en",
    resources: {
      en: { translation: require("./languages/en.json") },
      bn: { translation: require("./languages/bn.json") },
    },
  });

  // Create Telegram bot
  const botToken = process.env.BOT_TOKEN || config.bot.token;
  if (!botToken) {
    logger.error(chalk.red("❌ Bot token not provided! Set BOT_TOKEN in .env or config.json"));
    process.exit(1);
  }
  const bot = new TelegramBot(botToken, { polling: true });
  logger.info(chalk.cyan("🤖 Bot started successfully."));

  // Command store
  const commands = new Map();

  // Load commands
  const spinner = ora("Loading commands...").start();
  try {
    const files = await glob(["commands/**/*.js"]);
    for (const file of files) {
      try {
        const cmd = require(path.resolve(file));
        if (!cmd.config || !cmd.annieStart) continue;
        commands.set(cmd.config.name.toLowerCase(), cmd);
        spinner.succeed(`✅ Loaded: ${cmd.config.name}`);
        spinner.start(); // restart spinner for next command
      } catch (err) {
        spinner.fail(`❌ Failed to load ${file}: ${err.message}`);
        spinner.start();
      }
    }
    spinner.succeed("All commands loaded.");
  } catch (err) {
    spinner.fail(`❌ Error loading commands: ${err.message}`);
  }

  // Message handler
  bot.on("message", async (msg) => {
    if (!msg.text || !msg.text.startsWith(prefix)) return;

    const args = msg.text.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName);

    if (!command) {
      if (config.bot.commandNotFoundMessage) {
        return bot.sendMessage(msg.chat.id, config.bot.commandNotFoundMessage);
      }
      return;
    }

    // Role check
    const userId = msg.from.id;
    const requiredRole = command.config.role || 0;
    if (requiredRole === 1 && !admins.includes(userId)) {
      return bot.sendMessage(msg.chat.id, "🚫 This command is restricted to admins.");
    }

    try {
      await command.annieStart({ bot, msg, args, i18n: i18next });
      logger.info(`✅ Executed: ${commandName} by ${userId}`);
    } catch (err) {
      logger.error(`❌ Command Error (${commandName}): ${err.message}`);
      bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
    }
  });

  // Graceful shutdown
  process.on("unhandledRejection", (err) => {
    logger.error("UNHANDLED REJECTION:", err);
  });

  process.on("SIGINT", () => {
    logger.info("🛑 Bot shutting down...");
    process.exit(0);
  });
})();
