const axios = require("axios");

const JamesDahao = {};
const autoStartThreads = ["1606898753628191"];
const lastWindowSent = {};

const emojiMap = {
  cactus: "🌵",
  strawberry: "🍓",
  pumpkin: "🎃",
  sunflower: "🌻",
  "dragon fruit": "🐉",
  eggplant: "🍆",
  watermelon: "🍉",
  grape: "🍇",
  cocotank: "🥥",
  carnivorous: "🥩",
  "mr carrot": "🥕",
  mango: "🥭",
  tomatrio: "🍅",
  shroombino: "🍄",
};

function toPHTime(ms) {
  const d = new Date(ms);
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function formatTime(date) {
  return date.toLocaleTimeString("en-PH", { hour12: false });
}

function formatDate(date) {
  return date.toLocaleDateString("en-PH");
}

async function fetchStocks() {
  const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
  return res.data;
}

function buildMessage(data, participants, mode = "best") {
  const phNow = toPHTime(Date.now());
  const updatedAtPH = toPHTime(data.updatedAt);
  const nextRestock = new Date(phNow);
  nextRestock.setMinutes(Math.floor(phNow.getMinutes() / 5) * 5 + 5, 0, 0);

  let body = "🌱 Available Stocks 🌱\n\n";
  body += `🗓️ Date: ${formatDate(phNow)}\n`;
  body += `⏳ Now: ${formatTime(updatedAtPH)}\n`;
  body += `⌛ Next: ${formatTime(nextRestock)}\n\n`;

  const seeds = data.items.filter((it) => it.category.toLowerCase() === "seed");

  const rarityMap = {
    Rare: ["cactus", "strawberry"],
    Epic: ["pumpkin", "sunflower"],
    Legendary: ["dragon fruit", "eggplant"],
    Mythic: ["watermelon", "grape"],
    Godly: ["cocotank", "carnivorous"],
    Secret: ["mr carrot", "tomatrio", "shroombino", "mango"],
  };

  let filteredSeeds = [];
  if (mode === "best") {
    filteredSeeds = seeds.filter((it) =>
      [...rarityMap.Mythic, ...rarityMap.Godly, ...rarityMap.Secret].some((s) =>
        it.name.toLowerCase().includes(s)
      )
    );
  } else if (mode === "all") filteredSeeds = seeds;
  else filteredSeeds = seeds;

  const rarityGroups = {
    Rare: [],
    Epic: [],
    Legendary: [],
    Mythic: [],
    Godly: [],
    Secret: [],
  };

  filteredSeeds.forEach((it) => {
    let cleanName = it.name
      .replace(/<:[^>]+>/g, "")
      .replace(/ Seed$/i, "")
      .replace(/^"|"$/g, "")
      .trim();
    const lower = cleanName.toLowerCase();
    const emoji = Object.keys(emojiMap).find((key) => lower.includes(key))
      ? emojiMap[Object.keys(emojiMap).find((key) => lower.includes(key))]
      : "•";

    for (const [rarity, list] of Object.entries(rarityMap)) {
      if (list.some((s) => lower.includes(s))) {
        rarityGroups[rarity].push(`${emoji} ${cleanName}`);
        break;
      }
    }
  });

  let foundSecret = rarityGroups.Secret.length > 0;

  for (const [rarity, items] of Object.entries(rarityGroups)) {
    if (items.length > 0) {
      body += `${rarity}:\n${items.join("\n")}\n\n`;
    }
  }

  let mentions = [];
  if (foundSecret && participants) {
    const alertMsg = "@everyone : Secret seed has been detected!";
    const fromIndex = body.length;
    body += alertMsg;
    for (const uid of participants) {
      mentions.push({ tag: "@everyone", id: uid, fromIndex });
    }
  }

  if (
    !Object.values(rarityGroups).some((arr) => arr.length > 0)
  )
    return { body: null, updatedAtPH, mentions: [] };

  return { body, updatedAtPH, mentions };
}

function isInWindow(updatedAtPH) {
  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const windowStart = new Date(now);
  windowStart.setMinutes(minute, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setMinutes(windowStart.getMinutes() + 5, 0, 0);
  return updatedAtPH >= windowStart && updatedAtPH <= windowEnd;
}

async function attemptSend(api, threadID, participants, mode) {
  const data = await fetchStocks();
  const { body, updatedAtPH, mentions } = buildMessage(data, participants, mode);
  if (!body) return false;

  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const windowKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${minute}`;

  if (lastWindowSent[threadID] === windowKey) return false;
  if (isInWindow(updatedAtPH)) {
    api.sendMessage({ body, mentions }, threadID);
    lastWindowSent[threadID] = windowKey;
    return true;
  }
  return false;
}

function scheduleNext(api, threadID, participants, mode = "best") {
  if (JamesDahao[threadID]) clearTimeout(JamesDahao[threadID]);
  const now = toPHTime(Date.now());
  const next = new Date(now);
  next.setMinutes(Math.floor(now.getMinutes() / 5) * 5 + 5, 0, 0);
  const delay = next.getTime() - now.getTime();

  JamesDahao[threadID] = setTimeout(async function run() {
    const sent = await attemptSend(api, threadID, participants, mode);
    if (!sent) {
      const retry = setInterval(async () => {
        const result = await attemptSend(api, threadID, participants, mode);
        if (result) clearInterval(retry);
      }, 5000);
    }
    scheduleNext(api, threadID, participants, mode);
  }, delay);
}

module.exports = {
  config: {
    name: "stock",
    version: "3.1",
    author: "James Dahao",
    role: 2,
    category: "utility",
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const participants = event.participantIDs;
    const mode = args[0]?.toLowerCase() || "best";

    if (args[0] && args[0].toLowerCase() === "off") {
      if (JamesDahao[threadID]) {
        clearTimeout(JamesDahao[threadID]);
        delete JamesDahao[threadID];
        api.sendMessage("🟥 Auto Stocks update stopped", threadID);
      }
      return;
    }

    if (mode === "all") {
      if (JamesDahao[threadID]) clearTimeout(JamesDahao[threadID]);
      api.sendMessage("🟩 Auto Stocks update started (all rarity)", threadID);
      scheduleNext(api, threadID, participants, "all");
      return;
    }

    if (mode === "best") {
      if (JamesDahao[threadID]) clearTimeout(JamesDahao[threadID]);
      api.sendMessage("🟩 Auto Stocks update started (Mythic, Godly & Secret)", threadID);
      scheduleNext(api, threadID, participants, "best");
      return;
    }

    const data = await fetchStocks();
    const { body, mentions } = buildMessage(data, participants, mode);
    if (body) api.sendMessage({ body, mentions }, threadID);
    else api.sendMessage("❌ No stocks found right now.", threadID);
  },

  onLoad: async function ({ api }) {
    for (const threadID of autoStartThreads) {
      try {
        const info = await api.getThreadInfo(threadID);
        const participants = info.participantIDs;
        scheduleNext(api, threadID, participants, "best");
        api.sendMessage("🟢 Auto Stocks update initialized (best mode)", threadID);
      } catch (err) {
        console.error(`Failed to start auto-stock for ${threadID}:`, err.message);
      }
    }
  },
};
