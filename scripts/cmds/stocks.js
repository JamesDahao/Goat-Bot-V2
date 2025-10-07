const axios = require("axios");

const activeThreads = {};
const lastUpdated = {};

const rarityOrder = ["rare", "epic", "legendary", "mythic", "godly", "secret"];

const raritySeeds = {
  rare: ["cactus", "strawberry"],
  epic: ["pumpkin", "sunflower"],
  legendary: ["dragon fruit", "egg plant"],
  mythic: ["watermelon", "grape"],
  godly: ["cocotank", "carnivorous"],
  secret: ["mr carrot", "tomatrio", "shroombino", "mango"]
};

const emojiMap = {
  cactus: "🌵",
  strawberry: "🍓",
  pumpkin: "🎃",
  sunflower: "🌻",
  "dragon fruit": "🐉",
  "egg plant": "🍆",
  watermelon: "🍉",
  grape: "🍇",
  cocotank: "🥥",
  carnivorous: "🪴",
  "mr carrot": "🥕",
  tomatrio: "🍅",
  shroombino: "🍄",
  mango: "🥭"
};

function toPHTime(ms) {
  const d = new Date(ms);
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
}

function formatDateTime(date) {
  const d = toPHTime(date);
  const dateStr = d.toLocaleDateString("en-PH");
  const timeStr = d.toLocaleTimeString("en-PH", { hour12: false });
  return { dateStr, timeStr };
}

async function fetchStocks() {
  const res = await axios.get("https://plantsvsbrainrotsstocktracker.com/api/stock");
  return res.data;
}

function buildMessage(stockData, rarities) {
  const phNow = toPHTime(Date.now());
  const { dateStr, timeStr } = formatDateTime(phNow);
  const next = new Date(phNow.getTime() + 5 * 60000);
  const { timeStr: nextStr } = formatDateTime(next);

  let lines = [
    `🌱 Available Stocks 🌱`,
    ``,
    `🗓️ Date: ${dateStr}`,
    `⏳ Now: ${timeStr}`,
    `⌛ Next: ${nextStr}`,
    ``
  ];

  const seeds = stockData.items.filter(it => it.category.toLowerCase() === "seed");
  let hasSecret = false;

  for (const rarity of rarities) {
    const group = seeds.filter(it =>
      raritySeeds[rarity].some(s => it.name.toLowerCase().includes(s))
    );

    if (group.length > 0) {
      lines.push(`${rarity.charAt(0).toUpperCase() + rarity.slice(1)}:`);
      for (const seed of group) {
        const lower = seed.name.toLowerCase();
        const emoji =
          Object.keys(emojiMap).find(key => lower.includes(key)) ?
          emojiMap[Object.keys(emojiMap).find(key => lower.includes(key))] :
          "🌱";
        lines.push(`${emoji} ${seed.name}`);
      }
      lines.push("");
    }

    if (rarity === "secret" && group.length > 0) hasSecret = true;
  }

  return { message: lines.join("\n"), hasSecret };
}

function inCurrentWindow(updatedAtPH) {
  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const windowStart = new Date(now);
  windowStart.setMinutes(minute, 0, 0);
  const windowEnd = new Date(windowStart.getTime() + 5 * 60000 - 1000);
  return updatedAtPH >= windowStart && updatedAtPH <= windowEnd;
}

async function trySend(api, threadID, rarities, retryFlag) {
  const data = await fetchStocks();
  const updatedAtPH = toPHTime(data.updatedAt);
  const { message, hasSecret } = buildMessage(data, rarities);

  const now = toPHTime(Date.now());
  const minute = Math.floor(now.getMinutes() / 5) * 5;
  const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${minute}`;

  if (lastUpdated[threadID] === key) return false;
  if (!inCurrentWindow(updatedAtPH)) {
    if (!retryFlag.flag) retryFlag.flag = true;
    return false;
  }

  lastUpdated[threadID] = key;
  const body = hasSecret ? `@everyone\n${message}` : message;
  api.sendMessage(body, threadID);
  return true;
}

function startAuto(api, threadID, rarities) {
  if (activeThreads[threadID]) {
    clearTimeout(activeThreads[threadID]);
    delete activeThreads[threadID];
  }

  api.sendMessage(
    `🟩 Auto Stocks update started (${rarities.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(", ")})`,
    threadID
  );

  const run = async () => {
    const retryFlag = { flag: false };
    const sent = await trySend(api, threadID, rarities, retryFlag);
    if (!sent) {
      const retryInterval = setInterval(async () => {
        const ok = await trySend(api, threadID, rarities, retryFlag);
        if (ok) clearInterval(retryInterval);
      }, 5000);
    }

    const now = toPHTime(Date.now());
    const next = new Date(now.getTime() + 5 * 60000);
    const delay = next.getTime() - now.getTime();
    activeThreads[threadID] = setTimeout(run, delay);
  };

  run();
}

module.exports = {
  config: {
    name: "stock",
    version: "3.1",
    author: "James Dahao",
    role: 0,
    shortDescription: "Track PvB stocks by rarity",
    longDescription:
      "🪴 Commands:\n" +
      "• /stock → One-time show of all rarities\n" +
      "• /stock best → Auto mode (Mythic, Godly, Secret)\n" +
      "• /stock all → Auto mode (All rarities)\n" +
      "• /stock <rarity> → One-time show of that rarity\n" +
      "• /stock off → Stop any running auto mode\n\n" +
      "🔁 Auto updates every 5 minutes\n" +
      "🔔 Secret seeds mention @everyone automatically",
    category: "utility"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const cmd = args[0]?.toLowerCase();

    if (cmd === "off") {
      if (activeThreads[threadID]) {
        clearTimeout(activeThreads[threadID]);
        delete activeThreads[threadID];
        return api.sendMessage("🟥 Auto Stocks update stopped.", threadID);
      }
      return api.sendMessage("⚠️ No active auto mode.", threadID);
    }

    if (cmd === "best") return startAuto(api, threadID, ["mythic", "godly", "secret"]);
    if (cmd === "all") return startAuto(api, threadID, rarityOrder);

    if (rarityOrder.includes(cmd)) {
      const data = await fetchStocks();
      const { message, hasSecret } = buildMessage(data, [cmd]);
      const body = hasSecret ? `@everyone\n${message}` : message;
      return api.sendMessage(body, threadID);
    }

    const data = await fetchStocks();
    const { message, hasSecret } = buildMessage(data, rarityOrder);
    const body = hasSecret ? `@everyone\n${message}` : message;
    api.sendMessage(body, threadID);

    // ✅ Auto-start /stock best for thread 1606898753628191
    if (!activeThreads["1606898753628191"]) {
      startAuto(api, "1606898753628191", ["mythic", "godly", "secret"]);
    }
  }
};
