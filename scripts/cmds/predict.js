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
    description: "Displays upcoming secret seed restocks and automatically notifies 10 minutes before each restock.",
    category: "fun",
    guide: { en: "{pn}" }
  },

  seeds: [
    { name: "Mango Seed", time: "2025-10-12 03:50:00" },
    { name: "Mango Seed", time: "2025-10-12 12:55:00" },
    { name: "Mango Seed", time: "2025-10-13 12:10:00" },
    { name: "Mango Seed", time: "2025-10-15 04:15:00" },
    { name: "Mango Seed", time: "2025-10-16 08:15:00" },
    { name: "Mr Carrot Seed", time: "2025-10-10 21:20:00" },
    { name: "Mr Carrot Seed", time: "2025-10-11 03:00:00" },
    { name: "Mr Carrot Seed", time: "2025-10-11 15:05:00" },
    { name: "Mr Carrot Seed", time: "2025-10-12 13:20:00" },
    { name: "Mr Carrot Seed", time: "2025-10-12 23:45:00" },
    { name: "Tomatrio Seed", time: "2025-10-11 06:00:00" },
    { name: "Tomatrio Seed", time: "2025-10-11 07:05:00" },
    { name: "Tomatrio Seed", time: "2025-10-11 10:55:00" },
    { name: "Tomatrio Seed", time: "2025-10-11 11:10:00" },
    { name: "Tomatrio Seed", time: "2025-10-11 11:40:00" },
    { name: "Shroombino Seed", time: "2025-10-10 22:00:00" },
    { name: "Shroombino Seed", time: "2025-10-12 01:10:00" },
    { name: "Shroombino Seed", time: "2025-10-12 14:35:00" },
    { name: "Shroombino Seed", time: "2025-10-12 17:20:00" },
    { name: "Shroombino Seed", time: "2025-10-13 03:05:00" }
  ],

  onStart: async function({ message }) {
    const grouped = {};
    this.seeds.forEach(seed => {
      if (!grouped[seed.name]) grouped[seed.name] = [];
      grouped[seed.name].push(seed.time);
    });
    let msg = "🌱 PVB Secret Seed Prediction 🌱\n\n";
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
    case "Mr Carrot Seed": return "🥕";
    case "Tomatrio Seed": return "🍅";
    case "Shroombino Seed": return "🍄";
    case "Mango Seed": return "🥭";
    default: return "🌱";
  }
}
