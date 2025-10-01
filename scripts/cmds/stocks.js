const axios = require("axios");

const JamesDahao = {};

module.exports = {
  config: {
    name: "stocks",
    aliases: ["stock", "items"],
    version: "2.1",
    author: "James Dahao",
    role: 0,
    shortDescription: {
      en: "Check or auto-send available stocks from PVBR."
    },
    longDescription: {
      en: "Fetches and displays the current stocks from Plants vs Brainrots stock tracker API. Can also auto-send every 5 minutes + 10 seconds."
    },
    category: "Utility",
    guide: {
      en: "{p}stocks → Show once\n{p}stocks on → Auto-send every 5m10s\n{p}stocks off → Stop auto-send"
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

        let msg = "🌱 Available Stocks 🌱\n\n";

        if (seeds.length > 0) {
          msg += "🌾 Seeds:\n";
          seeds.forEach(item => {
            msg += `- ${item.name}: ${item.stock} in stock\n`;
          });
          msg += "\n";
        }

        if (gear.length > 0) {
          msg += "⚔️ Gear:\n";
          gear.forEach(item => {
            msg += `- ${item.name}: ${item.stock} in stock\n`;
          });
          msg += "\n";
        }

        msg += `📡 Source: ${res.data.source}\n🕒 Last Updated: ${new Date(res.data.timestamp).toLocaleString()}`;

        return msg;
      } catch (err) {
        return "❌ Failed to fetch stock data.";
      }
    }

    if (args[0] && args[0].toLowerCase() === "on") {
      if (JamesDahao[threadID]) {
        return api.sendMessage("⚠️ Auto stock updates are already running here.", threadID);
      }
      api.sendMessage("✅ Auto stock updates started. I’ll send updates every 5 minutes + 10 seconds.", threadID);
      JamesDahao[threadID] = setInterval(async () => {
        const msg = await fetchStocks();
        api.sendMessage(msg, threadID);
      }, 310 * 1000);
      return;
    }

    if (args[0] && args[0].toLowerCase() === "off") {
      if (!JamesDahao[threadID]) {
        return api.sendMessage("⚠️ No auto stock updates running here.", threadID);
      }
      clearInterval(JamesDahao[threadID]);
      delete JamesDahao[threadID];
      return api.sendMessage("🛑 Auto stock updates stopped.", threadID);
    }

    const msg = await fetchStocks();
    return api.sendMessage(msg, threadID);
  }
};
