const axios = require("axios");

module.exports = {
	config: {
		name: "stock",
		version: "1.0",
		author: "James Dahao",
		countDown: 5,
		role: 0,
		description: {
			en: "View Garden Horizons stock"
		},
		category: "info",
		guide: {
			en: "{pn}"
		}
	},

	langs: {
		en: {
			fetching: "🌾 | Fetching latest stock...",
			error: "❌ | Failed to fetch stock data.",
			noSeeds: "No seeds available.",
			noGear: "No gear available."
		}
	},

	onStart: async function ({ message, getLang }) {
		try {
			message.reply(getLang("fetching"));

			const res = await axios.get(
				"https://garden-horizons-stock.dawidfc.workers.dev/api/stock"
			);

			const data = res.data.data;

			// Convert to Philippine Time
			const phTime = new Date(data.lastGlobalUpdate).toLocaleString("en-PH", {
				timeZone: "Asia/Manila",
				year: "numeric",
				month: "long",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit"
			});

			// Format Seeds
			const seeds = data.seeds.length
				? data.seeds.map(s => `│ ▪ ${s.name} ➩ ${s.quantity}`).join("\n")
				: getLang("noSeeds");

			// Format Gear
			const gear = data.gear.length
				? data.gear.map(g => `│ ▪ ${g.name} ➩ ${g.quantity}`).join("\n")
				: getLang("noGear");

			const msg =
`╔═════•| 🌾 |•═════╗
 GARDEN HORIZONS STOCK
╚═════•| 🌾 |•═════╝

⏰ Time (PH): ${phTime}

🌱 SEEDS:
${seeds}

🛠 GEAR:
${gear}
`;

			return message.reply(msg);

		} catch (err) {
			console.error(err);
			return message.reply(getLang("error"));
		}
	}
};
