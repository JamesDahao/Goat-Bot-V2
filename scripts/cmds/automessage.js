module.exports = {
	config: {
		name: "automessage",
		version: "1.0",
		author: "James Dahao",
		description: "Send message automatically when bot starts",
		category: "system",
		role: 0
	},

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

				console.log("✅ Auto restart message sent.");
			}, 5000); // wait 5 seconds

		} catch (error) {
			console.error("❌ Automessage error:", error);
		}
	}
};
