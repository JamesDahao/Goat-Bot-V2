const axios = require("axios");

let lastStockSignature = null;
let waitingForMatch = false;
let retryInterval = null;
let schedulerStarted = false;

module.exports = {
	config: {
		name: "stock",
		version: "5.0",
		author: "James Dahao",
		countDown: 5,
		role: 0,
		description: {
			en: "Auto stock notifier"
		},
		category: "info",
		guide: {
			en: "{pn}"
		}
	},

	// Required by GoatBot
	onStart: async function () {
		return;
	},

	onLoad: async function ({ api }) {

		// Prevent double scheduler
		if (schedulerStarted) return;
		schedulerStarted = true;

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
					"https://garden-horizons-stock.dawidfc.workers.dev/api/stock"
				);

				const data = res.data.data;

				const apiTime = new Date(data.lastGlobalUpdate);
				const now = new Date();

				const apiRounded = roundTo5Min(apiTime);
				const nowRounded = roundTo5Min(now);

				// If API not synced to current 5-min block
				if (apiRounded !== nowRounded) {
					if (!waitingForMatch) {
						waitingForMatch = true;
						retryInterval = setInterval(checkStock, 10000);
					}
					return;
				}

				// Stop retry once synced
				if (retryInterval) {
					clearInterval(retryInterval);
					retryInterval = null;
				}
				waitingForMatch = false;

				const goodSeeds = data.seeds.filter(s =>
					GOOD_SEEDS.includes(s.name)
				);

				const goodGear = data.gear.filter(g =>
					GOOD_GEAR.includes(g.name)
				);

				if (goodSeeds.length === 0 && goodGear.length === 0)
					return;

				// Anti-duplicate signature
				const stockSignature = JSON.stringify({
					seeds: goodSeeds.map(s => `${s.name}:${s.quantity}`),
					gear: goodGear.map(g => `${g.name}:${g.quantity}`)
				});

				if (stockSignature === lastStockSignature)
					return;

				lastStockSignature = stockSignature;

				const phTime = apiTime.toLocaleString("en-PH", {
					timeZone: "Asia/Manila",
					year: "numeric",
					month: "long",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit"
				});

				const seedsText = goodSeeds.length
					? goodSeeds.map(s => `│ ▪ ${s.name} ➩ ${s.quantity}`).join("\n")
					: "";

				const gearText = goodGear.length
					? goodGear.map(g => `│ ▪ ${g.name} ➩ ${g.quantity}`).join("\n")
					: "";

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

				const threads = await api.getThreadList(100, null, ["INBOX"]);

				for (const thread of threads) {
					if (thread.isGroup) {
						api.sendMessage(msg, thread.threadID);
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
