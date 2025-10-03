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
      en: "Fetches and displays current stocks. Retries until refresh inside window."
    },
    category: "Utility",
    guide: {
      en: "{p}stocks → Show once\n{p}stocks on → Auto-send aligned every 5m20s\n{p}stocks off → Stop auto-send"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;

    // ---- Fetch API stocks ----
    async function fetchStocks() {
      try {
        const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
        const data = res.data;
        const items = data.items || [];
        const seeds = items.filter(it => it.category.toLowerCase().includes("seed"));
        const gear = items.filter(it => it.category.toLowerCase().includes("gear"));

        const updatedAt = new Date(data.updatedAt);
        const phTime = new Date(updatedAt.getTime() + (8 * 60 * 60 * 1000)); // PH time

        let body = "🌱 Available Stocks 🌱\n\n";
        body += `⏱️ API Time:\n${phTime.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}\n\n`;

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

        body += "📝 Note:\nIf API time ≠ PH time, API may be delayed.";

        if (alertNeeded) {
          const threadInfo = await api.getThreadInfo(threadID);
          const mentions = threadInfo.participantIDs.map(uid => ({
            tag: "@all",
            id: uid
          }));
          body += `\n\n@all`;
          return { body, mentions, updatedAt };
        } else {
          return { body, updatedAt };
        }
      } catch {
        return { body: "❌ Failed to fetch stock data." };
      }
    }

    // ---- Window checker ----
    function isInWindow(apiTime) {
      const now = new Date();
      const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // UTC+8
      const minute = Math.floor(phNow.getUTCMinutes() / 5) * 5;

      const windowStart = new Date(phNow);
      windowStart.setUTCMinutes(minute, 0, 0);

      const windowEnd = new Date(windowStart);
      windowEnd.setUTCMinutes(windowStart.getUTCMinutes() + 5, 0, 0);
      windowEnd.setSeconds(windowEnd.getSeconds() - 1);

      return apiTime >= windowStart && apiTime <= windowEnd;
    }

    // ---- Attempt to send ----
    async function attemptSend(sentRetryFlag) {
      const result = await fetchStocks();
      if (result.updatedAt && isInWindow(result.updatedAt)) {
        api.sendMessage(result, threadID);
        return true;
      } else {
        if (!sentRetryFlag.flag) {
          api.sendMessage("⚠️ API delay: stocks didn't refresh\nRetrying every 30s", threadID);
          sentRetryFlag.flag = true;
        }
        return false;
      }
    }

    // ---- Main scheduler ----
    function scheduleNext() {
      const now = new Date();
      const next = new Date(now);
      next.setSeconds(20, 0);
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
              const nowPH = new Date(Date.now() + (8 * 60 * 60 * 1000));
              const minute = Math.floor(nowPH.getUTCMinutes() / 5) * 5;
              const windowEnd = new Date(nowPH);
              windowEnd.setUTCMinutes(minute + 5, 0, 0);
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

    // ---- Command control ----
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
