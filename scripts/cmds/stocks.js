const axios = require("axios");

const JamesDahao = {};

module.exports = {
  config: {
    name: "stocks",
    aliases: ["stock", "item"],
    version: "3.2",
    author: "James Dahao",
    role: 2,
    shortDescription: {
      en: "Check or auto-send available stocks from PVBR."
    },
    longDescription: {
      en: "Fetches and displays the current stocks from Plants vs Brainrots Wikia stock API. Auto-send aligns every 5 minutes + 30 seconds (like 00:30, 05:30, 10:30...).\nIf Mr Carrot, Tomatrio, or Shroombino are available → bot will append @all."
    },
    category: "Utility",
    guide: {
      en: "{p}stocks → Show once\n{p}stocks on → Auto-send aligned every 5m30s\n{p}stocks off → Stop auto-send"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;

    async function fetchStocks() {
      try {
        const res = await axios.get("https://plantsvsbrainrotswikia.com/api/stock/current");
        const data = res.data.items;

        if (!data || data.length === 0) {
          return { body: "⚠️ No stock data available." };
        }

        let seeds = data.filter(item => item.category === "plants");
        let gear = data.filter(item => item.category === "gear");

        const date = new Date(res.data.updatedAt);
        const phTime = date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });

        let msg = "🌱 Available Stocks 🌱\n\n";
        msg += `⏱️ Time:\n${phTime} (PH)\n\n`;

        if (seeds.length > 0) {
          msg += "🌾 Seeds:\n";
          seeds.forEach(item => {
            msg += `• ${item.name.replace(/ Seed$/i, "")}: ${item.currentStock} in stock\n`;
          });
          msg += "\n";
        }

        if (gear.length > 0) {
          msg += "⚔️ Gear:\n";
          gear.forEach(item => {
            msg += `• ${item.name}: ${item.currentStock} in stock\n`;
          });
          msg += "\n";
        }

        msg += "📝 Note:\nIf time is ≠ to your time means API is down";

        // 🔹 Check for special stocks
        const keywords = ["Mr Carrot", "Tomatrio", "Shroombino"];
        const found = data.filter(item =>
          keywords.some(key => item.name.toLowerCase().includes(key.toLowerCase())) &&
          item.currentStock > 0
        );

        if (found.length > 0) {
          const threadInfo = await api.getThreadInfo(threadID);
          const mentions = threadInfo.participantIDs.map(uid => ({
            tag: "@all",
            id: uid
          }));

          msg += "\n\n@all";

          return { body: msg, mentions };
        }

        return { body: msg };
      } catch (err) {
        return { body: "❌ Failed to fetch stock data." };
      }
    }

    function scheduleNextRun() {
      const now = new Date();
      const next = new Date(now);
      next.setSeconds(30);
      next.setMilliseconds(0);
      const minutes = now.getMinutes();
      next.setMinutes(minutes - (minutes % 5) + 5);

      const delay = next.getTime() - now.getTime();

      JamesDahao[threadID] = setTimeout(async function run() {
        const msg = await fetchStocks();
        api.sendMessage(msg, threadID);
        scheduleNextRun();
      }, delay);
    }

    if (args[0] && args[0].toLowerCase() === "on") {
      if (JamesDahao[threadID]) {
        return api.sendMessage("⚠️ Auto stock updates are already running here.", threadID);
      }
      api.sendMessage("✅ Auto stock updates started.", threadID);
      scheduleNextRun();
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

    const msg = await fetchStocks();
    return api.sendMessage(msg, threadID);
  }
};
