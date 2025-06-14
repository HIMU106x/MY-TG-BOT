const axios = require("axios");

module.exports = {
  config: {
    name: "ffinfo",
    version: "1.5",
    author: "Himu Mals + GPT Update",
    shortDescription: "Get Free Fire player info by UID",
    category: "Games",
    role: 0,
    guide: {
      en: "{pn} <uid> [region]",
    },
  },

  annieStart: async function ({ bot, msg }) {
    const args = msg.text?.split(/\s+/).slice(1);
    const uid = args[0];
    const regionInput = args[1] || "bd";
    const region = regionInput.toLowerCase();

    if (!uid || isNaN(uid)) {
      return bot.sendMessage(msg.chat.id, "⚠ Please provide a valid UID. Example:\n`/ffinfo 1234567890`", { parse_mode: "Markdown" });
    }

    const api1 = `https://nodejs-info.vercel.app/info?uid=${uid}`;
    const api2 = `https://aditya-info-v8op.onrender.com/player-info?uid=${uid}&region=${region}`;
    const outfitApi = `https://aimguard-outfit.vercel.app/generate-profile?uid=${uid}&region=${region}`;

    try {
      const [res1, res2, outfitRes] = await Promise.all([
        axios.get(api1),
        axios.get(api2),
        axios.get(outfitApi, { responseType: "arraybuffer" }),
      ]);

      const data1 = res1.data?.data || {};
      const data2 = res2.data || {};

      if (!data1.player_info || !data2.player_info) {
        return bot.sendMessage(msg.chat.id, "❌ No data found for that UID.");
      }

      const tsToDate = (ts) =>
        ts ? new Date(ts * 1000).toLocaleString("en-US", { hour12: false }) : "-";

      const p1 = data1.player_info;
      const pet1 = data1.petInfo || {};
      const guild1 = data1.guildInfo || {};

      const p2 = data2.player_info?.basicInfo || {};
      const captain = data2.player_info?.captainBasicInfo || {};
      const clan = data2.player_info?.clanBasicInfo || {};
      const pet2 = data2.player_info?.petInfo || {};
      const social = data2.player_info?.socialInfo || {};
      const creditScore = data2.player_info?.creditScoreInfo?.creditScore || "-";
      const diamondCost = data2.player_info?.diamondCostRes?.diamondCost || "-";
      const weaponSkins = (p2.weaponSkinShows || []).join(", ") || "-";

      let msgText = `🎮 *FREE FIRE PLAYER INFO*\n\n`;

      msgText += `👤 *Nickname:* ${p1.nikname || p2.nickname || "Unknown"}\n`;
      msgText += `🆔 *UID:* ${uid}\n`;
      msgText += `🏅 *Level:* ${p1.level || p2.level || "-"} (Exp: ${p1.exp || p2.exp || "-"})\n`;
      msgText += `❤️ *Likes:* ${p1.likes || p2.liked || "-"}\n`;
      msgText += `🌍 *Region:* ${p1.region || p2.region || "-"}\n`;
      msgText += `📅 *Account Created:* ${p1.account_created || tsToDate(p2.createAt)}\n`;
      msgText += `⏰ *Last Login:* ${p1.last_login || tsToDate(p2.lastLoginAt)}\n`;
      msgText += `🖋 *Signature:* ${p1.signature || social.signature || "None"}\n\n`;

      msgText += `🎖 *Badges:* ${p2.badgeCnt || "-"} | ID: ${p2.badgeId || "-"}\n`;
      msgText += `🚩 *Banner ID:* ${p1.banner_id || p2.bannerId || "-"}\n`;
      msgText += `🖼 *Avatar ID:* ${p1.avatar_id || p2.headPic || "-"}\n`;
      msgText += `🏷 *Title ID:* ${p1.title_id || p2.title || "-"}\n\n`;

      msgText += `🏆 *Battle Stats:*\n`;
      msgText += ` - BR Rank: ${p1.br_rank_points || p2.rankingPoints || "-"}\n`;
      msgText += ` - CS Rank: ${p1.cs_rank_points || p2.csRankingPoints || "-"}\n`;
      msgText += ` - BP Level: ${p1.bp_level || p2.primeLevel?.level || "-"}\n`;
      msgText += ` - Max Rank: ${p2.maxRank || "-"} | CS Max: ${p2.csMaxRank || "-"}\n`;
      msgText += ` - Season: ${p2.seasonId || "-"}\n`;
      msgText += ` - Diamond Cost: ${diamondCost}\n\n`;

      msgText += `🐾 *Pet Info:*\n`;
      msgText += ` - Name: ${pet1.name || pet2.name || "None"}\n`;
      msgText += ` - Level: ${pet1.level || pet2.level || "-"}\n`;
      msgText += ` - Exp: ${pet1.exp || pet2.exp || "-"}\n\n`;

      msgText += `🏰 *Guild/Clan Info:*\n`;
      msgText += ` - Name: ${guild1.name || clan.clanName || "None"}\n`;
      msgText += ` - Level: ${guild1.level || clan.clanLevel || "-"}\n`;
      msgText += ` - Members: ${guild1.members || clan.memberNum || "-"}\n`;
      msgText += ` - Owner: ${guild1.owner_basic_info?.nickname || captain.nickname || "Unknown"} (Lvl: ${guild1.owner_basic_info?.level || captain.level || "-"})\n\n`;

      msgText += `🎯 *Social Info:*\n`;
      msgText += ` - Gender: ${social.gender || "-"}\n`;
      msgText += ` - Language: ${social.language || "-"}\n`;
      msgText += ` - Mode Pref: ${social.modePrefer || "-"}\n`;
      msgText += ` - Rank Show: ${social.rankShow || "-"}\n`;
      msgText += ` - Active: ${social.timeActive || "-"}\n`;
      msgText += ` - Honor Score: ${creditScore}\n\n`;

      msgText += `🔫 *Weapon Skins:* ${weaponSkins}\n`;
      msgText += `\n📌 *Region Used:* ${region}\n`;
      msgText += `🧠 Powered by Himu x GPT`;

      await bot.sendPhoto(msg.chat.id, { source: Buffer.from(outfitRes.data) }, { caption: msgText, parse_mode: "Markdown" });

    } catch (err) {
      console.error("FFINFO ERROR:", err.message);
      bot.sendMessage(msg.chat.id, "❌ Failed to fetch data. Please check UID or try again.");
    }
  }
};
