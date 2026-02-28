const axios = require("axios");

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
			en: "Auto stock notifier"
		},
		category: "info",
		guide: {
			en: "No command, Auto."
		}
	},

	onStart: async function () {
		return;
	},

	onLoad: async function ({ api }) {

		if (schedulerStarted) return;
		schedulerStarted = true;

		// 🔥 EDIT THESE IF YOU WANT
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
				// 🔥 prevent 403 cache
				const res = await axios.get(
					"https://stock.gardenhorizonswiki.com/stock.json",
					{
						headers: {
							"User-Agent": "Mozilla/5.0"
						}
					}
				);

				const data = res.data;

				const apiTime = new Date(data.updatedAt);
				const now = new Date();

				const apiRounded = roundTo5Min(apiTime);
				const nowRounded = roundTo5Min(now);

				// ⏳ If API not synced yet → retry every 10s
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

				// 🔥 NEW API STRUCTURE FIX
				const items = data.items || [];

				const goodSeeds = items.filter(
					i =>
						i.category === "seed" &&
						i.currentStock > 0 &&
						GOOD_SEEDS.includes(i.name)
				);

				const goodGear = items.filter(
					i =>
						i.category === "gear" &&
						i.currentStock > 0 &&
						GOOD_GEAR.includes(i.name)
				);

				if (goodSeeds.length === 0 && goodGear.length === 0)
					return;

				// 🛑 Anti duplicate
				const stockSignature = JSON.stringify({
					seeds: goodSeeds.map(s => `${s.name}:${s.currentStock}`),
					gear: goodGear.map(g => `${g.name}:${g.currentStock}`)
				});

				if (stockSignature === lastStockSignature)
					return;

				lastStockSignature = stockSignature;

				// 🇵🇭 Manila Time Formatting
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

				const seedsText = goodSeeds.length
					? goodSeeds.map(s => `│ ▪ ${s.name} ➩ ${s.currentStock}`).join("\n")
					: "│ None";

				const gearText = goodGear.length
					? goodGear.map(g => `│ ▪ ${g.name} ➩ ${g.currentStock}`).join("\n")
					: "│ None";

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

				// 🔔 SEND TO GROUPS (SAFE MENTION FIX)
				const threads = await api.getThreadList(100, null, ["INBOX"]);

				for (const thread of threads) {
					if (!thread.isGroup) continue;

					try {
						const threadInfo = await api.getThreadInfo(thread.threadID);
						if (!threadInfo.participantIDs.length) continue;

						const firstUser = threadInfo.participantIDs[0];

						api.sendMessage(
							{
								body: msg + "\n\n🔔 @everyone",
								mentions: [
									{
										tag: "@everyone",
										id: firstUser
									}
								]
							},
							thread.threadID
						);

					} catch (err) {
						console.log("Send error:", err.message);
					}
				}

			} catch (err) {
				console.error("Stock Auto Error:", err.message);
			}
		}

		// 🚀 Start scheduler aligned to 5min + 30sec
		const delay = getNextSchedule();

		setTimeout(() => {
			checkStock();
			setInterval(checkStock, 5 * 60 * 1000);
		}, delay);
	}
};
