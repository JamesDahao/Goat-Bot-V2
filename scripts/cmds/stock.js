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
			en: "Auto stock + weather notifier"
		},
		category: "info",
		guide: {
			en: "Automatic"
		}
	},

	onStart: async function () {
		return;
	},

	onLoad: async function ({ api }) {

		if (schedulerStarted) return;
		schedulerStarted = true;

		// 🔥 Load last saved signature
		if (fs.existsSync(CACHE_PATH)) {
			try {
				const saved = JSON.parse(fs.readFileSync(CACHE_PATH));
				lastStockSignature = saved.signature || null;
			} catch {}
		}

		const GOOD_SEEDS = [
			"Cherry",
			"Cabbage",
			"Potato",
			"Plum",
			"Banana",
			"Wheat"
		];

		const GOOD_GEAR = [
			"Super Sprinkler",
			"Turbo Sprinkler"
		];

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
			const minutes = now.getMinutes();
			const next5 = Math.ceil(minutes / 5) * 5;

			const next = new Date(now);
			next.setMinutes(next5);
			next.setSeconds(30);
			next.setMilliseconds(0);

			if (next <= now) {
				next.setMinutes(next.getMinutes() + 5);
			}

			return next - now;
		}

		async function checkStock() {
			try {
				const res = await axios.get(
					"https://stock.gardenhorizonswiki.com/stock.json",
					{ headers: { "User-Agent": "Mozilla/5.0" } }
				);

				if (!res.data.ok) return;

				const data = res.data.data;
				if (!data) return;

				const apiTime = new Date(data.lastGlobalUpdate);
				const now = new Date();

				const apiRounded = roundTo5Min(apiTime);
				const nowRounded = roundTo5Min(now);

				// Retry until synced
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

				const goodSeeds = (data.seeds || []).filter(s =>
					GOOD_SEEDS.includes(s.name) && s.quantity > 0
				);

				const goodGear = (data.gear || []).filter(g =>
					GOOD_GEAR.includes(g.name) && g.quantity > 0
				);

				const weather = data.weather || null;

				if (
					goodSeeds.length === 0 &&
					goodGear.length === 0 &&
					(!weather || !weather.active)
				) return;

				const stockSignature = JSON.stringify({
					seeds: goodSeeds.map(s => `${s.name}:${s.quantity}`),
					gear: goodGear.map(g => `${g.name}:${g.quantity}`),
					weather: weather && weather.active ? weather.type : null
				});

				if (stockSignature === lastStockSignature)
					return;

				lastStockSignature = stockSignature;
				saveSignature(stockSignature);

				// 🇵🇭 Manila time
				const phDate = new Date(apiTime.toLocaleString("en-US", {
					timeZone: "Asia/Manila"
				}));

				phDate.setSeconds(0);
				phDate.setMilliseconds(0);
				phDate.setMinutes(Math.floor(phDate.getMinutes() / 5) * 5);

				const startTime = new Date(phDate);
				const endTime = new Date(phDate);
				endTime.setMinutes(endTime.getMinutes() + 5);

				const datePart = startTime.toLocaleDateString("en-PH", {
					year: "numeric",
					month: "long",
					day: "numeric"
				});

				const startTimePart = startTime.toLocaleTimeString("en-PH", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
					hour12: true
				});

				const endTimePart = endTime.toLocaleTimeString("en-PH", {
					hour: "numeric",
					minute: "2-digit",
					second: "2-digit",
					hour12: true
				});

				const phTime = `${datePart} at ${startTimePart} - ${endTimePart}`;

				const seedsText = goodSeeds.map(s =>
					`│ ▪ ${s.name} ➩ ${s.quantity}`
				).join("\n") || "│ None";

				const gearText = goodGear.map(g =>
					`│ ▪ ${g.name} ➩ ${g.quantity}`
				).join("\n") || "│ None";

				let weatherText = "";
				if (weather && weather.active) {
					weatherText =
`\n🌦 WEATHER ALERT: ${weather.type.toUpperCase()}
${(weather.effects || []).map(e => `• ${e}`).join("\n")}
`;
				}

				const msg =
`╔═════•| 🌾 |•═════╗
 GOOD STOCK DETECTED
╚═════•| 🌾 |•═════╝

⏰ Time (PH): ${phTime}

🌱 SEEDS:
${seedsText}

🛠 GEAR:
${gearText}
${weatherText}
`;

				if (!msg.trim()) return;

				const threads = await api.getThreadList(100, null, ["INBOX"]);

				for (const thread of threads) {
					if (!thread.isGroup) continue;

					try {
						api.sendMessage(msg, thread.threadID);
					} catch (err) {
						console.log("Send error:", err.message);
					}
				}

			} catch (err) {
				console.error("Stock Auto Error:", err.message);
			}
		}

		const delay = getNextSchedule();

		setTimeout(() => {
			checkStock();
			setInterval(checkStock, 5 * 60 * 1000);
		}, delay);
	}
};
