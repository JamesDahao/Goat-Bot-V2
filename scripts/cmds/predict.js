const schedule = require("node-schedule");

module.exports = {
  config: {
    name: "predict",
    aliases: [],
    version: "1.1",
    author: "James Dahao",
    countDown: 5,
    role: 0,
    shortDescription: "Show and auto notify PVB Seed Prediction",
    description: "Displays upcoming seed restocks and automatically notifies 10 minutes before and when restocked (PH time).",
    category: "fun",
    guide: { en: "{pn}" }
  },

  seeds: [
    // Mango Seed
    { name: "Mango Seed", time: "2025-10-12 03:50 AM" },
    { name: "Mango Seed", time: "2025-10-12 12:55 PM" },
    { name: "Mango Seed", time: "2025-10-13 12:10 PM" },
    { name: "Mango Seed", time: "2025-10-15 04:15 AM" },
    { name: "Mango Seed", time: "2025-10-16 08:15 AM" },

    // Mr Carrot Seed
    { name: "Mr Carrot Seed", time: "2025-10-11 03:05 PM" },
    { name: "Mr Carrot Seed", time: "2025-10-12 01:20 PM" },
    { name: "Mr Carrot Seed", time: "2025-10-12 11:45 PM" },
    { name: "Mr Carrot Seed", time: "2025-10-13 05:45 PM" },
    { name: "Mr Carrot Seed", time: "2025-10-13 08:35 PM" },

    // Tomatrio Seed
    { name: "Tomatrio Seed", time: "2025-10-12 08:25 PM" },
    { name: "Tomatrio Seed", time: "2025-10-13 09:30 AM" },
    { name: "Tomatrio Seed", time: "2025-10-14 03:10 AM" },
    { name: "Tomatrio Seed", time: "2025-10-14 06:10 PM" },
    { name: "Tomatrio Seed", time: "2025-10-14 07:55 PM" },

    // Shroombino Seed
    { name: "Shroombino Seed", time: "2025-10-12 01:10 AM" },
    { name: "Shroombino Seed", time: "2025-10-12 02:35 PM" },
    { name: "Shroombino Seed", time: "2025-10-12 05:20 PM" },
    { name: "Shroombino Seed", time: "2025-10-13 03:05 AM" },
    { name: "Shroombino Seed", time: "2025-10-13 06:05 AM" },

    // Carnivorous Plant Seed
    { name: "Carnivorous Plant Seed", time: "2025-10-12 06:00 AM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-12 07:55 PM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-12 09:30 PM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-12 09:40 PM" },
    { name: "Carnivorous Plant Seed", time: "2025-10-13 01:25 AM" }
  ],

  onStart: async function({ message }) {
    const grouped = {};
    this.seeds.forEach(seed => {
      if (!grouped[seed.name]) grouped[seed.name] = [];
      grouped[seed.name].push(seed.time);
    });

    let msg = "🌱 PVB Seed Prediction 🌱\n\n";
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
    console.log("🌱 [PVB Predict] Bot loaded. Scheduling all restocks (PH time).");

    setInterval(() => {
      const phNow = new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" });
      console.log(`[⏰ PH Time Check] ${phNow}`);
    }, 5 * 60 * 1000);

    for (const seed of module.exports.seeds) {
      const restockTime = parsePHTime(seed.time);
      const notifyTime = new Date(restockTime.getTime() - 10 * 60 * 1000);
      const now = getNowPH();

      console.log(`📅 Scheduling ${seed.name}`);
      console.log(`   ↳ Restock at: ${restockTime.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`);
      console.log(`   ↳ 10-min reminder: ${notifyTime.toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`);

      if (notifyTime > now) {
        schedule.scheduleJob(notifyTime, function() {
          const msg = `⏳ 10-Minute Reminder!\n\n🌱 PVB Seed Prediction 🌱\n\n${getEmoji(seed.name)} ${seed.name}\n[1] Stock: 1\n⏱️ ${seed.time}\n⚠️ Restock in 10 minutes!`;
          api.sendMessage(msg, threadID);
          console.log(`⚠️ Sent 10-min reminder for ${seed.name} (${seed.time} PH)`);
        });
      }

      if (restockTime > now) {
        schedule.scheduleJob(restockTime, function() {
          const msg = `✅ Restock Alert!\n\n🌱 PVB Seed Prediction 🌱\n\n${getEmoji(seed.name)} ${seed.name}\n[1] Stock: 1\n🕒 ${seed.time}\n🎉 Seed is now restocked!`;
          api.sendMessage(msg, threadID);
          console.log(`🎉 Sent restock alert for ${seed.name} (${seed.time} PH)`);
        });
      }
    }
  }
};

function parsePHTime(timeStr) {
  const [datePart, timePart, ampm] = timeStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  let [hour, minute] = timePart.split(":").map(Number);
  if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
  const d = new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
  return d;
}

function getNowPH() {
  return new Date();
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
