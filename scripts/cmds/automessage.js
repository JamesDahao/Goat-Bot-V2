module.exports = {
	config: {
		name: "automessage",
		version: "1.0",
		author: "James Dahao",
		description: "Auto send restart message",
		category: "system",
		role: 0,
		guide: "{pn}"
	},
	
	onStart: async function () {},

	onLoad: async function ({ api }) {
		try {
			setTimeout(async () => {
				const threads = await api.getThreadList(100, null, ["INBOX"]);
				const startTime = new Date().toLocaleString();

				for (const thread of threads) {
					if (thread.isGroup) {
						await api.sendMessage(
`🤖 𝗕𝗢𝗧 𝗥𝗘𝗦𝗧𝗔𝗥𝗧𝗘𝗗

━━━━━━━━━━━━━━
✅ Bot restarts every 5 hours.
━━━━━━━━━━━━━━

Thank you for waiting!`,
							thread.threadID
						);
					}
				}

				console.log("✅ Restart message sent to all groups.");
			}, 5000);
		}
		catch (err) {
			console.error("❌ Automessage error:", err);
		}
	}
};
