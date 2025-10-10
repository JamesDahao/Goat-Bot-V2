const schedule = require("node-schedule");

module.exports = {
  config: {
    name: "predict",
    aliases: [],
    version: "1.0",
    author: "James Dahao",
    countDown: 5,
    role: 0,
    shortDescription: "Show and auto notify PVB Secret Seed Prediction",
    description: "Displays upcoming secret seed restocks and automatically notifies 10 minutes before each restock in Philippine time.",
    category: "fun",
    guide: { en: "{pn}" }
  },

  seeds: [
    { name: "Mr Carrot", time: "2025-10-11 05:20:00" },
    { name: "Mr Carrot", time: "2025-10-11 11:00:00" },
    { name: "Mr Carrot", time: "2025-10-11 23:05:00" },
    { name: "Mr Carrot", time: "2025-10-12 21:20:00" },
    { name: "Mr Carrot", time: "2025-10-13 07:45:00" },
    { name: "Tomatrio", time: "2025-10-11 14:00:00" },
    { name: "Tomatrio", time: "2025-10-11 15:05:00" },
    { name: "Tomatrio", time: "2025-10-11 18:55:00" },
    { name: "Tomatrio", time: "2025-10-11 19:10:00" },
    { name: "Tomatrio", time: "2025-10-11 19:40:00" },
    { name: "Shroombino", time: "2025-10-11 06:00:00" },
    { name: "Shroombino", time: "2025-10-12 09:10:00" },
    { name: "Shroombino", time: "2025-10-12 22:35:00" },
    { name: "Shroombino", time: "2025-10-13 01:20:00" },
    { name: "Shroombino", time: "2025-10-13 11:05:00" },
    { name: "Mango", time: "2025-10-12 11:50:00" },
    { name: "Mango", time: "2025-10-12 20:55:00" },
    { name: "Mango", time: "2025-10-13 20:10:00" },
    { name: "Mango", time: "2025-10-15 12:15:00" },
    { name: "Mango", time: "2025-10-16 16:15:00" }
  ],

  onStart: async function({ message }) {
    const grouped = {};
    this.seeds.forEach(seed => {
      if (!grouped[seed.name]) grouped[seed.name] = [];
      grouped[seed.name].push(seed.time);
    });
    let msg = "🌱 PVB Secret Seed Prediction 🌱\n(All times in 🇵🇭 Philippine Time)\n\n";
    for (const [name, times] of Object.entries(grouped)) {
      msg += `${getEmoji(name)} ${name}\n--------------------\n`;
      times.forEach((time, i) => {
        msg += `[${i + 1}] Stock: 1\n⏱️ ${time}\n`;
      });
      msg += "\n";
    }
    message.reply(msg);
  },

  onLoad: async function({ api }) {
    const threadID = "1606898753628191";
    const now = new Date();
    for (const seed of module.exports.seeds) {
      const restockTime = new Date(seed.time.replace(" ", "T") + "+08:00");
      const notifyTime = new Date(restockTime.getTime() - 10 * 60 * 1000);
      if (notifyTime > now) {
        schedule.scheduleJob(notifyTime, function() {
          const msg = `🌱 PVB Secret Seed Prediction 🌱\n\n${getEmoji(seed.name)} ${seed.name}\n[1] Stock: 1\n⏱️ ${seed.time}\n⏳ Restock in 10 minutes!`;
          api.sendMessage(msg, threadID);
        });
      }
    }
  }
};

function getEmoji(name) {
  switch (name) {
    case "Mr Carrot": return "🥕";
    case "Tomatrio": return "🍅";
    case "Shroombino": return "🍄";
    case "Mango": return "🥭";
    default: return "🌱";
  }
}
