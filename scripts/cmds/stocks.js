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

module.exports = {
  config: {
    name: "stock",
    aliases: ["stocks", "item"],
    version: "1.0",
    author: "James Dahao",
    role: 2, // admin only
    category: "utility",
    shortDescription: {
      en: "Check or auto-send available stocks from PVBR."
    }
  },

  onStart: async function ({ api, event, args, role }) {
    const threadID = event.threadID;
    if (role < 2) return api.sendMessage("⚠️ Only admins can run this command.", threadID);

    async function fetchStocks() {
      try {
        const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock?since=0");
        const data = res.data;
        const items = data.items || [];
        const seeds = items.filter(it => it.category.toLowerCase().includes("seed"));
        const gear = items.filter(it => it.category.toLowerCase().includes("gear"));

        const apiUTC = new Date(data.updatedAt);
        const updatedAtPH = new Date(apiUTC.toLocaleString("en-US", { timeZone: "Asia/Manila" }));

        const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));

        console.log(`PH Now: ${phNow}`);
        console.log(`API updatedAt PH: ${updatedAtPH}`);

        let body = "🌱 Available Stocks 🌱\n\n";
        body += `🗓️ Date: ${updatedAtPH.toLocaleDateString("en-PH")}\n`;
        body += `⏳ Now: ${updatedAtPH.toLocaleTimeString("en-PH")}\n`;

        const nextPH = new Date(phNow);
        const minute = Math.floor(phNow.getMinutes() / 5) * 5 + 5;
        nextPH.setMinutes(minute, 30, 0);
        body += `⌛ Next: ${nextPH.toLocaleTimeString("en-PH")}\n\n`;

        if (seeds.length > 0) {
          body += "🌾 Seeds:\n";
          seeds.forEach(it => {
            let cleanName = it.name.replace(/<:[^>]+>/g, "").replace(/ Seed$/i, "").trim();
            const lower = cleanName.toLowerCase();
            let emoji = "•";
            for (const key in emojiMap) if (lower.includes(key)) emoji = emojiMap[key];
            body += `${emoji} ${cleanName}: ${it.currentStock} in stock\n`;
          });
          body += "\n";
        }

        if (gear.length > 0) {
          body += "⚔️ Gear:\n";
          gear.forEach(it => {
            let cleanName = it.name.replace(/<:[^>]+>/g, "").trim();
            const lower = cleanName.toLowerCase();
            let emoji = "•";
            for (const key in emojiMap) if (lower.includes(key)) emoji = emojiMap[key];
            body += `${emoji} ${cleanName}: ${it.currentStock} in stock\n`;
          });
        }

        return { body, updatedAtPH, phNow };
      } catch {
        return { body: "❌ Failed to fetch stock data." };
      }
    }

    function isInWindow(updatedAtPH) {
      const phNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const minute = Math.floor(phNow.getMinutes() / 5) * 5;
      const windowStart = new Date(phNow);
      windowStart.setMinutes(minute, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setMinutes(windowStart.getMinutes() + 5, 0, -1);
      return updatedAtPH >= windowStart && updatedAtPH <= windowEnd;
    }

    async function attemptSend(sentRetryFlag) {
      const result = await fetchStocks();
      if (result.updatedAtPH && isInWindow(result.updatedAtPH)) {
        api.sendMessage(result.body, threadID);
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
      next.setSeconds(30, 0);
      const m = now.getMinutes();
      next.setMinutes(m - (m % 5) + 5);
      const delay = next.getTime() - now.getTime();

      JamesDahao[threadID] = setTimeout(async function run() {
        let sentRetryFlag = { flag: false };
        let sent = await attemptSend(sentRetryFlag);
        if (!sent) {
          const retryInterval = setInterval(async () => {
            const result = await fetchStocks();
            if (result.updatedAtPH && isInWindow(result.updatedAtPH)) {
              api.sendMessage(result.body, threadID);
              clearInterval(retryInterval);
            } else {
              const nowPH = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
              const minute = Math.floor(nowPH.getMinutes() / 5) * 5;
              const windowEnd = new Date(nowPH);
              windowEnd.setMinutes(minute + 5, 0, -1);
              if (nowPH > windowEnd) clearInterval(retryInterval);
            }
          }, 30000);
        }
        scheduleNext();
      }, delay);
    }

    if (args[0] && args[0].toLowerCase() === "on") {
      if (JamesDahao[threadID]) return;
      scheduleNext();
      return;
    }

    if (args[0] && args[0].toLowerCase() === "off") {
      if (!JamesDahao[threadID]) return;
      clearTimeout(JamesDahao[threadID]);
      delete JamesDahao[threadID];
      return;
    }

    const msgObj = await fetchStocks();
    return api.sendMessage(msgObj.body, threadID);
  }
};
