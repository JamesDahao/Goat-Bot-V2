const axios = require("axios");

let intervals = {};
let lastUpdated = {};

module.exports = {
  config: {
    name: "pvb",
    aliases: [],
    version: "1.1",
    author: "James Dahao",
    countDown: 5,
    role: 0,
    description: "Plants vs Brainrots stock tracker",
    longDescription: "Tracks PVB seed stock updates from the API and reports high-tier seeds automatically.",
    category: "utility",
    guide: "{pn} = current stock | {pn} on = every restock | {pn} stop"
  },

  onStart: async function ({ api }) {
    const groupID = "1606898753628191";
    api.sendMessage("Bot Startup: auto use /pvb on", groupID);
    startTracking(api, groupID);
  },

  onChat: async function ({ api, event, args }) {
    const cmd = args[0];
    if (cmd === "on") return startTracking(api, event.threadID, true);
    if (cmd === "stop") return stopTracking(api, event.threadID);
    return fetchOnce(api, event.threadID);
  }
};

// ---------- Helper Functions ----------

function getPHTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function formatTime(date) {
  return date.toTimeString().split(" ")[0];
}

async function fetchStock() {
  const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
  return res.data;
}

function groupSeedsByRarity(items) {
  const rarities = { rare: [], epic: [], legendary: [], mythic: [], godly: [], secret: [] };

  for (const item of items) {
    if (item.category === "seed") {
      const name = item.name.toLowerCase();
      if (name.includes("cactus")) rarities.rare.push("🌵 Cactus");
      else if (name.includes("strawberry")) rarities.rare.push("🍓 Strawberry");
      else if (name.includes("pumpkin")) rarities.epic.push("🎃 Pumpkin");
      else if (name.includes("sunflower")) rarities.epic.push("🌻 Sunflower");
      else if (name.includes("dragon")) rarities.legendary.push("🐉 Dragon Fruit");
      else if (name.includes("egg")) rarities.legendary.push("🍆 Egg Plant");
      else if (name.includes("watermelon")) rarities.mythic.push("🍉 Watermelon");
      else if (name.includes("grape")) rarities.mythic.push("🍇 Grape");
      else if (name.includes("coco")) rarities.godly.push("🥥 Cocotank");
      else if (name.includes("carnivorous")) rarities.godly.push("🥩 Carnivorous");
      else if (name.includes("carrot")) rarities.secret.push("🥕 Mr Carrot");
      else if (name.includes("tomatrio")) rarities.secret.push("🍅 Tomatrio");
      else if (name.includes("shroombino")) rarities.secret.push("🍄 Shroombino");
      else if (name.includes("mango")) rarities.secret.push("🥭 Mango");
    }
  }
  return rarities;
}

function buildMessage(rarities, nowTime, nextTime) {
  let msg = "🧠 PVB Seed Stock Update\n\n";
  const order = ["rare", "epic", "legendary", "mythic", "godly", "secret"];
  const names = {
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
    godly: "Godly",
    secret: "Secret"
  };
  let hasHighTier = false;

  for (const r of order) {
    if (rarities[r].length) {
      msg += `🌱 ${names[r]}:\n${rarities[r].join("\n")}\n\n`;
      if (["legendary", "mythic", "godly", "secret"].includes(r)) hasHighTier = true;
    }
  }

  msg += `⏱️ Now: ${nowTime}\n⏱️ Next: ${nextTime}`;
  return { msg, hasHighTier };
}

function getNextWindow() {
  const now = getPHTime();
  const mins = now.getMinutes();
  const next = new Date(now);
  next.setMinutes(Math.floor(mins / 5) * 5 + 5, 0, 0);
  return formatTime(next);
}

async function fetchOnce(api, threadID) {
  try {
    const data = await fetchStock();
    const rarities = groupSeedsByRarity(data.items);
    const now = formatTime(getPHTime());
    const next = getNextWindow();
    const { msg } = buildMessage(rarities, now, next);
    api.sendMessage(msg, threadID);
  } catch (e) {}
}

async function checkStock(api, threadID) {
  try {
    const now = getPHTime();
    const mins = now.getMinutes();
    const windowStart = new Date(now);
    windowStart.setMinutes(Math.floor(mins / 5) * 5, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setMinutes(windowEnd.getMinutes() + 5, 0, 0);

    const data = await fetchStock();
    const updatedAtPH = new Date(new Date(data.updatedAt).toLocaleString("en-US", { timeZone: "Asia/Manila" }));

    if (updatedAtPH >= windowStart && updatedAtPH < windowEnd) {
      if (lastUpdated[threadID] !== data.updatedAt) {
        lastUpdated[threadID] = data.updatedAt;

        const rarities = groupSeedsByRarity(data.items);
        const nowStr = formatTime(now);
        const nextStr = formatTime(windowEnd);
        const { msg, hasHighTier } = buildMessage(rarities, nowStr, nextStr);

        // Only send when at least one high-tier (legendary+) appears
        if (hasHighTier) api.sendMessage(msg, threadID);
      }
    }
  } catch (e) {}
}

function startTracking(api, threadID, manual = false) {
  if (intervals[threadID]) clearInterval(intervals[threadID]);

  intervals[threadID] = setInterval(() => checkStock(api, threadID), 5000);

  if (manual) api.sendMessage("Started PVB stock tracking (auto checks every 5 minutes).", threadID);
  checkStock(api, threadID);
}

function stopTracking(api, threadID) {
  if (intervals[threadID]) {
    clearInterval(intervals[threadID]);
    delete intervals[threadID];
    api.sendMessage("Stopped PVB stock tracking.", threadID);
  }
}
