const axios = require("axios");

module.exports = {
  config: {
    name: "stocks",
    aliases: ["stock", "items"],
    version: "1.0",
    author: "coc nico",
    role: 0,
    shortDescription: {
      en: "Check available stocks from PVBR."
    },
    longDescription: {
      en: "Fetches and displays the current stocks from Plants vs Brainrots stock tracker API."
    },
    category: "Utility",
    guide: {
      en: "Type {p}stocks to see the available seeds and gear."
    }
  },

  onStart: async function ({ api, event }) {
    try {
      const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
      const data = res.data.data;

      if (!data || data.length === 0) {
        return api.sendMessage("⚠️ No stock data available at the moment.", event.threadID);
      }

      let seeds = data.filter(item => item.category === "SEEDS");
      let gear = data.filter(item => item.category === "GEAR");

      let msg = "🌱 **Available Stocks** 🌱\n\n";

      if (seeds.length > 0) {
        msg += "🌾 **Seeds:**\n";
        seeds.forEach(item => {
          msg += `- ${item.name}: ${item.stock} in stock\n`;
        });
        msg += "\n";
      }

      if (gear.length > 0) {
        msg += "⚔️ **Gear:**\n";
        gear.forEach(item => {
          msg += `- ${item.name}: ${item.stock} in stock\n`;
        });
        msg += "\n";
      }

      msg += `📡 Source: ${res.data.source}\n🕒 Last Updated: ${new Date(res.data.timestamp).toLocaleString()}`;

      return api.sendMessage(msg, event.threadID);
    } catch (err) {
      console.error(err);
      return api.sendMessage("❌ Failed to fetch stock data.", event.threadID);
    }
  }
};
