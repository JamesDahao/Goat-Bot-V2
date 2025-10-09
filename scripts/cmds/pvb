module.exports = {
  config: {
    name: "pvb",
    aliases: [],
    version: "1.0",
    author: "James Dahao",
    countDown: 5,
    role: 0,
    description: "Plants vs Brainrots stock tracker",
    longDescription: "Tracks the seed stock updates from the PVB API",
    category: "utility",
    guide: "{pn} = current stock | {pn} on = every restock | {pn} stop"
  },
  onStart: async function ({ api }) {
    const groupID = "1606898753628191";
    api.sendMessage("Bot Startup: /pvb on mode activated (checking stock updates every 5 minutes)", groupID);
    startTracking(api, groupID);
  },
  onChat: async function ({ api, event, args }) {
    const command = args[0];
    if (command === "on") return startTracking(api, event.threadID, true);
    if (command === "stop") return stopTracking(api, event.threadID);
    return fetchOnce(api, event.threadID);
  }
};

const axios = require("axios");
let intervals = {};
let lastUpdated = {};

function getPHTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function formatTime(date) {
  return date.toTimeString().split(" ")[0];
}

function groupSeedsByRarity(items) {
  const rarityIcons = {
    rare: "🌵🍓",
    epic: "🎃🌻",
    legendary: "🐉🍆",
    mythic: "🍉🍇",
    godly: "🥥🥩",
    secret: "🥕🍅🍄🥭"
  };
  const rarities = { rare: [], epic: [], legendary: [], mythic: [], godly: [], secret: [] };
  for (const item of items) {
    if (item.category === "seed") {
      if (item.name.toLowerCase().includes("cactus")) rarities.rare.push("🌵 Cactus");
      else if (item.name.toLowerCase().includes("strawberry")) rarities.rare.push("🍓 Strawberry");
      else if (item.name.toLowerCase().includes("pumpkin")) rarities.epic.push("🎃 Pumpkin");
      else if (item.name.toLowerCase().includes("sunflower")) rarities.epic.push("🌻 Sunflower");
      else if (item.name.toLowerCase().includes("dragon")) rarities.legendary.push("🐉 Dragon Fruit");
      else if (item.name.toLowerCase().includes("egg")) rarities.legendary.push("🍆 Egg Plant");
      else if (item.name.toLowerCase().includes("watermelon")) rarities.mythic.push("🍉 Watermelon");
      else if (item.name.toLowerCase().includes("grape")) rarities.mythic.push("🍇 Grape");
      else if (item.name.toLowerCase().includes("coco")) rarities.godly.push("🥥 Cocotank");
      else if (item.name.toLowerCase().includes("carnivorous")) rarities.godly.push("🥩 Carnivorous");
      else if (item.name.toLowerCase().includes("carrot")) rarities.secret.push("🥕 Mr Carrot");
      else if (item.name.toLowerCase().includes("tomatrio")) rarities.secret.push("🍅 Tomatrio");
      else if (item.name.toLowerCase().includes("shroombino")) rarities.secret.push("🍄 Shroombino");
      else if (item.name.toLowerCase().includes("mango")) rarities.secret.push("🥭 Mango");
    }
  }
  return rarities;
}

async function fetchStock() {
  const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
  return res.data;
}

function buildMessage(rarities, nextTime) {
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
  msg += `⏱️ Next: ${nextTime}`;
  return { msg, hasHighTier };
}

async function fetchOnce(api, threadID) {
  try {
    const data = await fetchStock();
    const rarities = groupSeedsByRarity(data.items);
    const nextTime = getNextWindow();
    const { msg } = buildMessage(rarities, nextTime);
    api.sendMessage(msg, threadID);
  } catch {}
}

function getNextWindow() {
  const now = getPHTime();
  const mins = now.getMinutes();
  const next = new Date(now);
  next.setMinutes(Math.floor(mins / 5) * 5 + 5, 0, 0);
  return formatTime(next);
}

async function startTracking(api, threadID, manual = false) {
  if (intervals[threadID]) clearInterval(intervals[threadID]);
  intervals[threadID] = setInterval(() => checkStock(api, threadID), 5000);
  if (manual) api.sendMessage("Started PVB stock tracking (every 5 minutes)", threadID);
  checkStock(api, threadID);
}

function stopTracking(api, threadID) {
  if (intervals[threadID]) {
    clearInterval(intervals[threadID]);
    delete intervals[threadID];
    api.sendMessage("Stopped PVB stock tracking.", threadID);
  }
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
    const updatedAtPH = new Date(data.updatedAt);
    const updatedPH = new Date(updatedAtPH.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    if (updatedPH >= windowStart && updatedPH < windowEnd) {
      if (lastUpdated[threadID] !== data.updatedAt) {
        lastUpdated[threadID] = data.updatedAt;
        const rarities = groupSeedsByRarity(data.items);
        const { msg, hasHighTier } = buildMessage(rarities, formatTime(windowEnd));
        if (hasHighTier) api.sendMessage(msg, threadID);
      }
    }
  } catch {}
}
