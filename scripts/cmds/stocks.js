const axios = require("axios");

const JamesDahao = {};

const emojiMap = {
  cactus: "🌵",
  strawberry: "🍓",
  pumpkin: "🎃",
  sunflower: "🌻",
  "dragon fruit": "🐉",
  eggplant: "🍆",
  watermelon: "🍉",
  grape: "🍇",
  cocotank: "🥥",
  carnivorous: "🥩",
  "mr carrot": "🥕",
  tomatrio: "🍅",
  shroombino: "🍄",
  "water bucket": "🪣",
  "frost grenade": "💣",
  "banana gun": "🔫",
  "frost blower": "❄️",
  "carrot launcher": "🚀"
};

const alertSeeds = ["mr carrot", "tomatrio", "shroombino"];

function convertToPH(date) {
  return new Date(new Date(date).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function isInWindow(apiTimeRaw) {
  const apiTime = convertToPH(apiTimeRaw);
  const phNow = convertToPH(Date.now());
  const minute = Math.floor(phNow.getMinutes() / 5) * 5;
  const windowStart = new Date(phNow);
  windowStart.setMinutes(minute, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setMinutes(windowStart.getMinutes() + 5, 0, 0);
  windowEnd.setSeconds(windowEnd.getSeconds() - 1);
  return apiTime >= windowStart && apiTime <= windowEnd;
}

module.exports = {
  config: {
    name: "stocks",
    aliases: ["stock", "item"],
    version: "1.4",
    author: "James Dahao",
    role: 2,
    shortDescription: {
      en: "Check or auto-send available stocks from PVBR."
    },
    longDescription: {
      en: "Fetches and displays current stocks."
    },
    category: "Utility",
    guide: {
      en: "{p}stocks → Show once\n{p}stocks on → Auto-send aligned every 5m20s\n{p}stocks off → Stop auto-send"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;

    async function fetchStocks() {
      try {
        const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
        const data = res.data;
        const items = data.items || [];
        const seeds = items.filter(it => it.category.toLowerCase().includes("seed"));
        const gear = items.filter(it => it.category.toLowerCase().includes("gear"));
        const date = convertToPH(data.updatedAt || Date.now());
        const phTime = date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });

        let body = "🌱 Available Stocks 🌱\n\n";
        body += `⏱️ Time:\n${phTime} (PH)\n\n`;

        let alertNeeded = false;

        if (seeds.length > 0) {
          body += "🌾 Seeds:\n";
          seeds.forEach(it => {
            let cleanName = it.name.replace(/<:[^>]+>/g, "").replace(/ Seed$/i, "").trim();
            const lower = cleanName.toLowerCase();
            let matchedKey = null;
            for (const key in emojiMap) {
              if (lower.includes(key)) {
                matchedKey = key;
                break;
              }
            }
            const emoji = matchedKey ? emojiMap[matchedKey] : "•";
            body += `${emoji} ${cleanName}: ${it.currentStock} in stock\n`;
            for (const seedName of alertSeeds) {
              if (lower.includes(seedName) && it.currentStock > 0) {
                alertNeeded = true;
              }
            }
          });
          body += "\n";
        }

        if (gear.length > 0) {
          body += "⚔️ Gear:\n";
          gear.forEach(it => {
            let cleanName = it.name.replace(/<:[^>]+>/g, "").trim();
            const lower = cleanName.toLowerCase();
            let matchedKey = null;
            for (const key in emojiMap) {
              if (lower.includes(key)) {
                matchedKey = key;
                break;
              }
            }
            const emoji = matchedKey ? emojiMap[matchedKey] : "•";
            body += `${emoji} ${cleanName}: ${it.currentStock} in stock\n`;
          });
          body += "\n";
        }

        body += "📝 Note:\nIf time is ≠ to your time means API is down";

        if (alertNeeded) {
          const threadInfo = await api.getThreadInfo(threadID);
          const mentions = threadInfo.participantIDs.map(uid => ({
            tag: "@all",
            id: uid
          }));
          body += `\n\n@all`;
          return { body, mentions, updatedAt: date };
        } else {
          return { body, updatedAt: date };
        }
      } catch {
        return { body: "❌ Failed to fetch stock data." };
      }
    }

    async function attemptSend(sentRetryFlag) {
      const result = await fetchStocks();
      if (result.updatedAt && isInWindow(result.updatedAt)) {
        api.sendMessage(result, threadID);
        return true;
      } else {
        if (!sentRetryFlag.flag) {
          api.sendMessage("⚠️ API delay: stocks didn't refresh\nRetrying every 30s until window ends", threadID);
          sentRetryFlag.flag = true;
        }
        return false;
      }
    }

    function scheduleNext() {
      const now = new Date();
      const next = new Date(now);
      next.setSeconds(20);
      next.setMilliseconds(0);
      const m = now.getMinutes();
      next.setMinutes(m - (m % 5) + 5);
      const delay = next.getTime() - now.getTime();

      JamesDahao[threadID] = setTimeout(async function run() {
        let sentRetryFlag = { flag: false };
        let sent = await attemptSend(sentRetryFlag);
        if (!sent) {
          const retryInterval = setInterval(async () => {
            const result = await fetchStocks();
            if (result.updatedAt && isInWindow(result.updatedAt)) {
              api.sendMessage(result, threadID);
              clearInterval(retryInterval);
            } else {
              const nowPH = convertToPH(Date.now());
              const minute = Math.floor(nowPH.getMinutes() / 5) * 5;
              const windowEnd = new Date(nowPH);
              windowEnd.setMinutes(minute + 5, 0, 0);
              windowEnd.setSeconds(windowEnd.getSeconds() - 1);
              if (nowPH > windowEnd) {
                clearInterval(retryInterval);
              }
            }
          }, 30000);
        }
        scheduleNext();
      }, delay);
    }

    if (args[0] && args[0].toLowerCase() === "on") {
      if (JamesDahao[threadID]) {
        return api.sendMessage("⚠️ Auto stock updates are already running here.", threadID);
      }
      api.sendMessage("✅ Auto stock updates started.", threadID);
      scheduleNext();
      return;
    }

    if (args[0] && args[0].toLowerCase() === "off") {
      if (!JamesDahao[threadID]) {
        return api.sendMessage("⚠️ No auto stock updates running here.", threadID);
      }
      clearTimeout(JamesDahao[threadID]);
      delete JamesDahao[threadID];
      return api.sendMessage("🛑 Auto stock updates stopped.", threadID);
    }

    const msgObj = await fetchStocks();
    return api.sendMessage(msgObj, threadID);
  }
};
