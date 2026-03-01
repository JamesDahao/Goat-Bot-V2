const axios = require("axios");
const fs = require("fs");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "stockCache.json");

let lastStockSignature = null;
let waitingForMatch = false;
let retryInterval = null;
let schedulerStarted = false;

module.exports = {
	config: {
		name: "stock",
		version: "1.0",
		author: "James Dahao",
		countDown: 5,
		role: 0,
		description: {
			en: "Auto stock notifier with mentions"
		},
		category: "info",
		guide: {
			en: "No command, Automatic"
		}
	},

	onStart: async function () {
		return;
	},

	onLoad: async function ({ api }) {

		if (schedulerStarted) return;
		schedulerStarted = true;

		// Load last sent stock signature
		if (fs.existsSync(CACHE_PATH)) {
			try {
				const saved = JSON.parse(fs.readFileSync(CACHE_PATH));
				lastStockSignature = saved.signature || null;
			} catch {}
		}

		const GOOD_SEEDS = ["Cherry", "Cabbage", "Potato", "Plum", "Banana", "Wheat"];
		const GOOD_GEAR = ["Super Sprinkler", "Turbo Sprinkler"];

		function saveSignature(signature) {
			fs.writeFileSync(CACHE_PATH, JSON.stringify({ signature }));
		}

		function roundTo5Min(date) {
			const d = new Date(date);
			d.setSeconds(0);
			d.setMilliseconds(0);
			d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
			return d.getTime();
		}

		function getNextSchedule() {
			const now = new Date();
			const next = new Date(now);
			const next5 = Math.ceil(now.getMinutes() / 5) * 5;
			next.setMinutes(next5);
			next.setSeconds(30);
			next.setMilliseconds(0);
			if (next <= now) next.setMinutes(next.getMinutes() + 5);
			return next - now;
		}

		async function checkStock() {
			try {
				const res = await axios.get("https://stock.gardenhorizonswiki.com/stock.json", {
	headers: {
		"Accept": "application/json, text/plain, */*",
		"Accept-Language": "en-US,en;q=0.9",
		"Cache-Control": "no-cache",
		"Pragma": "no-cache",
		"Connection": "keep-alive",
		"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
		"Referer": "https://gardenhorizonswiki.com/",
		"Origin": "https://gardenhorizonswiki.com/",
		"Sec-Fetch-Dest": "empty",
		"Sec-Fetch-Mode": "cors",
		"Sec-Fetch-Site": "same-site"
	}
});
				if (!res.data.ok) return;

				const data = res.data.data;
				if (!data) return;

				const apiTime = new Date(data.lastGlobalUpdate);
				const now = new Date();

				const apiRounded = roundTo5Min(apiTime);
				const nowRounded = roundTo5Min(now);

				if (apiRounded !== nowRounded) {
					if (!waitingForMatch) {
						waitingForMatch = true;
						retryInterval = setInterval(checkStock, 10000);
					}
					return;
				}

				if (retryInterval) {
					clearInterval(retryInterval);
					retryInterval = null;
				}
				waitingForMatch = false;

				// Filter good stock
				const goodSeeds = (data.seeds || []).filter(s => GOOD_SEEDS.includes(s.name) && s.quantity > 0);
				const goodGear = (data.gear || []).filter(g => GOOD_GEAR.includes(g.name) && g.quantity > 0);

				if (goodSeeds.length === 0 && goodGear.length === 0) return;

				// Anti-duplicate
				const stockSignature = JSON.stringify({
					seeds: goodSeeds.map(s => `${s.name}:${s.quantity}`),
					gear: goodGear.map(g => `${g.name}:${g.quantity}`)
				});
				if (stockSignature === lastStockSignature) return;
				lastStockSignature = stockSignature;
				saveSignature(stockSignature);

				// Manila time formatting
				const phDate = new Date(apiTime.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
				phDate.setSeconds(0);
				phDate.setMilliseconds(0);
				phDate.setMinutes(Math.floor(phDate.getMinutes() / 5) * 5);

				const startTime = new Date(phDate);
				const endTime = new Date(phDate);
				endTime.setMinutes(endTime.getMinutes() + 5);

				const datePart = startTime.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
				const startTimePart = startTime.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
				const endTimePart = endTime.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
				const phTime = `${datePart} at ${startTimePart} - ${endTimePart}`;

				const seedsText = goodSeeds.map(s => `│ ▪ ${s.name} ➩ ${s.quantity}`).join("\n") || "│ None";
				const gearText = goodGear.map(g => `│ ▪ ${g.name} ➩ ${g.quantity}`).join("\n") || "│ None";

				const msg =
`╔═════•| 🌾 |•═════╗
 GOOD STOCK DETECTED
╚═════•| 🌾 |•═════╝

⏰ Time (PH): ${phTime}

🌱 SEEDS:
${seedsText}

🛠 GEAR:
${gearText}
`;

				if (!msg.trim()) return;

				// Send to all groups with mentions
				const threads = await api.getThreadList(100, null, ["INBOX"]);
				for (const thread of threads) {
					if (!thread.isGroup) continue;
					const threadInfo = await api.getThreadInfo(thread.threadID);
					const mentions = threadInfo.participantIDs.map(id => ({ tag: "@", id }));
					try {
						api.sendMessage({ body: msg + "\n🔔 @everyone", mentions }, thread.threadID);
					} catch (err) {
						console.log("Send error:", err.message);
					}
				}

			} catch (err) {
				console.error("Stock Auto Error:", err.message);
			}
		}

		// Start scheduler aligned to 5min + 30sec
		const delay = getNextSchedule();
		setTimeout(() => {
			checkStock();
			setInterval(checkStock, 5 * 60 * 1000);
		}, delay);
	}
};
