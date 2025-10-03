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
    version: "1.1",
    author: "James Dahao",
    role: 2,
    category: "utility",
    description: { en: "Show current stocks or auto-send every restock window." },
    guide: { en: "{pn} → Show stocks\n{pn} on → Auto-send every 5min+30sec\n{pn} off → Stop auto-send" }
  },

  onStart: async function({ message, event, args, role }) {
    const threadID = event.threadID;

    function convertToPH(date) {
      return new Date(new Date(date).toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    }

    async function fetchStocks() {
      try {
        const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
        const data = res.data;
        const updatedAt = convertToPH(data.updatedAt);

        console.log("PH Now:", new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" }));
        console.log("API updatedAt PH:", updatedAt.toLocaleString("en-PH", { timeZone: "Asia/Manila" }));

        const seeds = data.items.filter(i => i.category.toLowerCase() === "seed");
        const gear = data.items.filter(i => i.category.toLowerCase() === "gear");

        let body = "🌱 Available Stocks 🌱\n\n";
        const nowPH = new Date();
        body += `🗓️ Date: ${nowPH.toLocaleDateString("en-PH")}\n`;
        body += `⏳ Now: ${nowPH.toLocaleTimeString("en-PH")}\n`;

        const nextRestock = new Date(nowPH);
        const m = nowPH.getMinutes();
        nextRestock.setMinutes(m - (m % 5) + 5, 30, 0);
        body += `⌛ Next: ${nextRestock.toLocaleTimeString("en-PH")}\n\n`;

        if (seeds.length) {
          body += "🌾 Seeds:\n";
          seeds.forEach(s => {
            let name = s.name.replace(/ Seed$/i, "").trim();
            let emoji = Object.keys(emojiMap).find(key => name.toLowerCase().includes(key)) || "•";
            body += `${emojiMap[emoji]} ${name}: ${s.currentStock} in stock\n`;
          });
          body += "\n";
        }

        if (gear.length) {
          body += "⚔️ Gear:\n";
          gear.forEach(g => {
            let name = g.name.trim();
            let emoji = Object.keys(emojiMap).find(key => name.toLowerCase().includes(key)) || "•";
            body += `${emojiMap[emoji]} ${name}: ${g.currentStock} in stock\n`;
          });
        }

        return { body, updatedAt };
      } catch (e) {
        console.error("Fetch error:", e);
        return { body: "❌ Failed to fetch stock data." };
      }
    }

    function isInWindow(apiTime) {
      const nowPH = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      const minute = Math.floor(nowPH.getMinutes() / 5) * 5;
      const windowStart = new Date(nowPH);
      windowStart.setMinutes(minute, 0, 0);
      const windowEnd = new Date(windowStart);
      windowEnd.setMinutes(windowStart.getMinutes() + 5, 0, -1);

      console.log("Window Start:", windowStart.toLocaleTimeString("en-PH"));
      console.log("Window End:", windowEnd.toLocaleTimeString("en-PH"));

      return apiTime >= windowStart && apiTime <= windowEnd;
    }

    function scheduleNext() {
      const now = new Date();
      const next = new Date(now);
      const m = now.getMinutes();
      next.setMinutes(m - (m % 5) + 5, 30, 0);
      const delay = next.getTime() - now.getTime();

      JamesDahao[threadID] = setTimeout(async function run() {
        let sent = false;
        const retryInterval = setInterval(async () => {
          const result = await fetchStocks();
          if (result.updatedAt && isInWindow(result.updatedAt)) {
            message.reply(result.body, threadID);
            sent = true;
            clearInterval(retryInterval);
          } else {
            const nowPH = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
            const minute = Math.floor(nowPH.getMinutes() / 5) * 5;
            const windowEnd = new Date(nowPH);
            windowEnd.setMinutes(minute + 5, 0, -1);
            if (nowPH > windowEnd) {
              console.log("Window ended, stopping retries.");
              clearInterval(retryInterval);
            } else if (!sent) {
              console.log("API not refreshed yet, retrying...");
              message.reply("⚠️ API delay: stocks didn't refresh. Retrying in 30s...", threadID);
            }
          }
        }, 30000);
        scheduleNext();
      }, delay);
    }

    if (args[0] && args[0].toLowerCase() === "on") {
      if (role < 2) return message.reply("❌ Only admins can start auto stock.");
      if (JamesDahao[threadID]) return message.reply("⚠️ Auto stock updates already running.");
      message.reply("✅ Auto stock updates started.");
      scheduleNext();
      return;
    }

    if (args[0] && args[0].toLowerCase() === "off") {
      if (role < 2) return message.reply("❌ Only admins can stop auto stock.");
      if (!JamesDahao[threadID]) return message.reply("⚠️ No auto stock updates running.");
      clearTimeout(JamesDahao[threadID]);
      delete JamesDahao[threadID];
      message.reply("🛑 Auto stock updates stopped.");
      return;
    }

    const msgObj = await fetchStocks();
    message.reply(msgObj.body, threadID);
  }
};
