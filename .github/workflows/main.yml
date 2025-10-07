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
  "water bucket": "🪣",
  "frost grenade": "💣",
  "banana gun": "🔫",
  "frost blower": "❄️",
  "carrot launcher": "🚀",
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

function groupByRarity(seeds) {
  const groups = { common: [], rare: [], epic: [], legendary: [], godly: [], secret: [] };
  const godlySeeds = ["cocotank", "carnivorous", "dragon fruit"];
  const secretSeeds = ["tomatrio", "mr carrot", "shroombino", "mango"];
  const legendarySeeds = ["banana gun", "frost grenade", "frost blower", "carrot launcher"];

  seeds.forEach((it) => {
    let name = it.name.replace(/<:[^>]+>/g, "").replace(/ Seed$/i, "").replace(/^"|"$/g, "").trim();
    const lower = name.toLowerCase();
    if (secretSeeds.some((s) => lower.includes(s))) groups.secret.push(name);
    else if (godlySeeds.some((s) => lower.includes(s))) groups.godly.push(name);
    else if (legendarySeeds.some((s) => lower.includes(s))) groups.legendary.push(name);
    else if (lower.includes("cactus") || lower.includes("pumpkin")) groups.epic.push(name);
    else if (lower.includes("sunflower") || lower.includes("strawberry")) groups.rare.push(name);
    else groups.common.push(name);
  });
  return groups;
}

function buildMessage(data, participants, mode = "best") {
  const phNow = toPHTime(Date.now());
  const updatedAtPH = toPHTime(data.updatedAt);
  const nextRestock = new Date(phNow);
  nextRestock.setMinutes(Math.floor(phNow.getMinutes() / 5) * 5 + 5);
  nextRestock.setSeconds(0);

  const seeds = data.items.filter((it) => it.category.toLowerCase() === "seed");
  if (seeds.length === 0) return { body: null, updatedAtPH, mentions: [] };

  const groups = groupByRarity(seeds);
  let filtered = { common: [], rare: [], epic: [], legendary: [], godly: [], secret: [] };

  if (mode === "godly") filtered.godly = groups.godly;
  else if (mode === "secret") filtered.secret = groups.secret;
  else if (mode === "best") {
    filtered.legendary = groups.legendary;
    filtered.godly = groups.godly;
    filtered.secret = groups.secret;
  } else if (mode === "all") filtered = groups;
  else filtered = groups;

  const hasAny =
    filtered.common.length ||
    filtered.rare.length ||
    filtered.epic.length ||
    filtered.legendary.length ||
    filtered.godly.length ||
    filtered.secret.length;

  if (!hasAny) return { body: null, updatedAtPH, mentions: [] };

  let body = "🌱 Available Stocks 🌱\n\n";
  body += `🗓️ Date: ${formatDate(phNow)}\n`;
  body += `⏳ Now: ${formatTime(updatedAtPH)}\n`;
  body += `⌛ Next: ${formatTime(nextRestock)}\n\n`;
  body += "🌾 Seeds on stock:\n";

  const addGroup = (title, arr) => {
    if (arr.length > 0) {
      body += `\n${title}:\n`;
      arr.forEach((n) => {
        const lower = n.toLowerCase();
        const match = Object.keys(emojiMap).find((k) => lower.includes(k));
        body += `${match ? emojiMap[match] : "•"} ${n}\n`;
      });
    }
  };

  addGroup("Common", filtered.common);
  addGroup("Rare", filtered.rare);
  addGroup("Epic", filtered.epic);
  addGroup("Legendary", filtered.legendary);
  addGroup("Godly", filtered.godly);
  addGroup("Secret", filtered.secret);

  let mentions = [];
  if (filtered.secret.length > 0 && participants) {
    const fromIndex = body.length;
    body += "\n@everyone : Secret seed has been detected!";
    for (const uid of participants) mentions.push({ tag: "@everyone", id: uid, fromIndex });
  }

  return { body, updatedAtPH, mentions };
}

function isInWindow(updatedAtPH) {
  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const start = new Date(now);
  start.setMinutes(minute);
  start.setSeconds(0);
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + 5);
  end.setSeconds(0);
  return updatedAtPH >= start && updatedAtPH <= end;
}

async function attemptSend(api, threadID, participants, sentRetryFlag, mode) {
  const data = await fetchStocks();
  const { body, updatedAtPH, mentions } = buildMessage(data, participants, mode);
  if (!body) return false;

  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${minute}`;
  if (lastWindowSent[threadID] === key) return false;

  if (isInWindow(updatedAtPH)) {
    api.sendMessage({ body, mentions }, threadID);
    lastWindowSent[threadID] = key;
    return true;
  } else {
    if (!sentRetryFlag.flag) sentRetryFlag.flag = true;
    return false;
  }
}

function scheduleNext(api, threadID, participants, mode = "best") {
  const now = toPHTime(Date.now());
  const next = new Date(now);
  next.setMinutes(Math.floor(now.getMinutes() / 5) * 5 + 5);
  next.setSeconds(0);
  const delay = next.getTime() - now.getTime();

  JamesDahao[threadID] = setTimeout(async function run() {
    const sentRetryFlag = { flag: false };
    const sent = await attemptSend(api, threadID, participants, sentRetryFlag, mode);
    if (!sent) {
      const retry = setInterval(async () => {
        const ok = await attemptSend(api, threadID, participants, sentRetryFlag, mode);
        if (ok) clearInterval(retry);
      }, 5000);
    }
    scheduleNext(api, threadID, participants, mode);
  }, delay);
}

module.exports = {
  config: {
    name: "stock",
    version: "3.0",
    author: "James Dahao",
    role: 2,
    category: "utility",
    shortDescription: { en: "Auto/Manual stock tracker" },
    longDescription: { en: "Shows and auto-sends PVBR stocks grouped by rarity." },
    guide: {
      en: "{p}stock → one-time all stocks\n{p}stock all → auto all\n{p}stock godly/secret/best → auto rarity\n{p}stock off → stop auto updates",
    },
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const participants = event.participantIDs;
    const mode = args[0]?.toLowerCase() || "";

    if (mode === "off") {
      if (!JamesDahao[threadID]) return;
      clearTimeout(JamesDahao[threadID]);
      delete JamesDahao[threadID];
      api.sendMessage("🟥 Auto Stocks update stopped", threadID);
      return;
    }

    if (["all", "godly", "secret", "best"].includes(mode)) {
      api.sendMessage(`🟩 Auto Stocks update started (${mode})`, threadID);
      scheduleNext(api, threadID, participants, mode);
      return;
    }

    const data = await fetchStocks();
    const { body, mentions } = buildMessage(data, participants, "all");
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
