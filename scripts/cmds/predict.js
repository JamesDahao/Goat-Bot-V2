const schedule = require("node-schedule");

module.exports = {
  config: {
    name: "predict",
    aliases: [],
    version: "1.3",
    author: "James Dahao",
    countDown: 5,
    role: 0,
    shortDescription: "Show and auto notify PVB Secret Seed Prediction",
    description: "Displays upcoming seed restocks and automatically notifies 10 minutes before and when restocked (PH time).",
    category: "fun",
    guide: { en: "{pn}" }
  },

  seeds: [
    // 🥭 Mango Seed
    { name: "Mango Seed", time: "2025-10-12 03:50 AM" },
    { name: "Mango Seed", time: "2025-10-12 12:55 PM" },
    { name: "Mango Seed", time: "2025-10-13 12:10 PM" },
    { name: "Mango Seed", time: "2025-10-15 04:15 AM" },
    { name: "Mango Seed", time: "2025-10-16 08:15 AM" },

    // 🥕 Mr Carrot Seed
    { name: "Mr Carrot Seed", time: "2025-10-11 03:00 AM" },
    { name: "Mr Carrot Seed", time: "2025-10-11 03:05 PM" },
    { name: "Mr Carrot Seed", time: "2025-10-12 01:20 PM" },
    { name: "Mr Carrot Seed", time: "2025-10-12 11:45 PM" },
    { name: "Mr Carrot Seed", time: "2025-10-13 05:45 PM" },

    // 🍅 Tomatrio Seed
    { name: "Tomatrio Seed", time: "2025-10-11 06:00 AM" },
    { name: "Tomatrio Seed", time: "2025-10-11 07:05 AM" },
    { name: "Tomatrio Seed", time: "2025-10-11 10:55 AM" },
    { name: "Tomatrio Seed", time: "2025-10-11 11:10 AM" },
    { name: "Tomatrio Seed", time: "2025-10-11 11:40 AM" },

    // 🍄 Shroombino Seed
    { name: "Shroombino Seed", time: "2025-10-12 01:10 AM" },
    { name: "Shroombino Seed", time: "2025-10-12 02:35 PM" },
    { name: "Shroombino Seed", time: "2025-10-12 05:20 PM" },
    { name: "Shroombino Seed", time: "2025-10-13 03:05 AM" },
    { name: "Shroombino Seed", time: "2025-10-13 06:05 AM" },

    // 🥩 Carnivorous Plant Seed
    { name: "Carnivorous Plant Seed", time: "2025-10-11 12:15 AM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-11 07:35 AM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-12 06:00 AM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-12 07:55 PM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-12 09:30 PM" }
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
    const now = getPHTime();

    for (const seed of module.exports.seeds) {
      const restockTime = parsePHTime(seed.time); // use PH time as-is
      const notifyTime = new Date(restockTime.getTime() - 10 * 60 * 1000);

      // Schedule 10-minute reminder
      if (notifyTime > now) {
        schedule.scheduleJob(notifyTime, function() {
          const msg = `⏳ 10-Minute Reminder!\n\n🌱 PVB Secret Seed Prediction 🌱\n\n${getEmoji(seed.name)} ${seed.name}\n[1] Stock: 1\n⏱️ ${seed.time}\n⚠️ Restock in 10 minutes!`;
          api.sendMessage(msg, threadID);
        });
      }

      // Schedule exact restock alert
      if (restockTime > now) {
        schedule.scheduleJob(restockTime, function() {
          const msg = `✅ Restock Alert!\n\n🌱 PVB Secret Seed Prediction 🌱\n\n${getEmoji(seed.name)} ${seed.name}\n[1] Stock: 1\n🕒 ${seed.time}\n🎉 Seed is now restocked!`;
          api.sendMessage(msg, threadID);
        });
      }
    }
  }
};

// Convert "YYYY-MM-DD hh:mm AM/PM" → Date object (PH time)
function parsePHTime(timeStr) {
  const [datePart, timePart, ampm] = timeStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  let [hour, minute] = timePart.split(":").map(Number);

  if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  // Return PH local date directly
  return new Date(year, month - 1, day, hour, minute, 0);
}

// Get current PH time (UTC+8)
function getPHTime() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function getEmoji(name) {
  switch (name) {
    case "Mr Carrot Seed": return "🥕";
    case "Tomatrio Seed": return "🍅";
    case "Shroombino Seed": return "🍄";
    case "Mango Seed": return "🥭";
    case "Carnivorous Plant Seed": return "🥩";
    default: return "🌱";
  }
}
