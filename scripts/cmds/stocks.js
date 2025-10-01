const axios = require("axios");

const JamesDahao = {};

module.exports = {
  config: {
    name: "stocks",
    aliases: ["stock", "item"],
    version: "2.3",
    author: "James Dahao",
    role: 2,
    shortDescription: {
      en: "Check or auto-send available stocks from PVBR."
    },
    longDescription: {
      en: "Fetches and displays the current stocks from Plants vs Brainrots stock tracker API. Auto-send aligns every 5 minutes + 10 seconds (like 00:10, 05:10, 10:10...)."
    },
    category: "Utility",
    guide: {
      en: "{p}stocks → Show once\n{p}stocks on → Auto-send aligned every 5m10s\n{p}stocks off → Stop auto-send"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;

    async function fetchStocks() {
      try {
        const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
        const data = res.data.data;

        if (!data || data.length === 0) {
          return "⚠️ No stock data available.";
        }

        let seeds = data.filter(item => item.category === "SEEDS");
        let gear = data.filter(item => item.category === "GEAR");

        // Convert timestamp to PH time (GMT+8)
        const date = new Date(res.data.timestamp);
        const phTime = date.toLocaleString("en-PH", { timeZone: "Asia/Manila" });

        let msg = "🌱 Available Stocks 🌱\n\n";
        msg += `⏱️ Time:\n${phTime} (PH)\n\n`;

        if (seeds.length > 0) {
          msg += "🌾 Seeds:\n";
          seeds.forEach(item => {
            msg += `• ${item.name}: ${item.stock} in stock\n`;
          });
          msg += "\n";
        }

        if (gear.length > 0) {
          msg += "⚔️ Gear:\n";
          gear.forEach(item => {
            msg += `• ${item.name}: ${item.stock} in stock\n`;
          });
          msg += "\n";
        }

        msg += "📝 Note:\nIf time is ≠ to your time means API is down";

        return msg;
      } catch (err) {
        return "❌ Failed to fetch stock data.";
      }
    }

    function scheduleNextRun() {
      const now = new Date();
      const next = new Date(now);
      next.setSeconds(10);
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
      api.sendMessage("✅ Auto stock updates started. I’ll send every 5 minutes + 10 seconds aligned to the clock.", threadID);
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
