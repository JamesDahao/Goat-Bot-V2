module.exports = {
	config: {
		name: "bot",
		version: "1.0",
		author: "James Dahao",
		countDown: 5,
		role: 0,
		shortDescription: "Bot replies with random messages",
		longDescription: "Bot responds with a random message when mentioned or called",
		category: "fun",
		guide: {
			en: "{pn} text"
		}
	},

	onStart: async () => {},

	onChat: async function ({ message, event, api }) {
		const quotes = [
			"Oh! ano nanaman trip mo?",
			"Naneto tawag ng tawag, di moko utusan!!!",
			"Yung Admin kausapin mo wala ako sa mood",
			"don't disturb 🤖 I'm busy right now.",
			"Anong maitutulong ko sayo Supot!",
			"I'm busy with my owner right now.",
			"Call my owner instead.",
			"The creator of this bot is James Dahao 💻",
			"Hey! Why are you calling me so much? 😅",
			"Ask later, I'm not in the mood 🙂",
			"Oo na, sige na!",
			"Why are you calling me so much 🙈",
			"Ayos muna mukha!"
		];

		const Prefixes = ["bot", "Bot"];
		if (!event.body) return;

		const prefix = Prefixes.find(p => event.body.toLowerCase().startsWith(p.toLowerCase()));
		if (!prefix) return;

		const uid = event.senderID;
		let name = "User";

		try {
			const userInfo = await api.getUserInfo(uid);
			name = userInfo[uid]?.name || "User";
		} catch (error) {
			console.error("Error fetching user info:", error);
		}

		const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

		return message.reply({
			body: `🥀 ${name} 🥀\n\n${randomQuote}`,
			mentions: [{ id: uid, tag: name }]
		});
	}
};
