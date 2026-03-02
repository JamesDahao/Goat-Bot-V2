module.exports = {
	config: {
		name: "automessage",
		version: "1.0",
		author: "James Dahao",
		description: "Automatically sends restart message when bot starts",
		role: 0
	},

	onStart: async function ({ api }) {
		try {
			const threads = await api.getThreadList(100, null, ["INBOX"]);
			const startTime = new Date().toLocaleString();

			for (const thread of threads) {
				if (thread.isGroup) {
					await api.sendMessage(
`🤖 𝗕𝗢𝗧 𝗥𝗘𝗦𝗧𝗔𝗥𝗧𝗘𝗗

━━━━━━━━━━━━━━
📋 Bot restarts every 5 hours.
━━━━━━━━━━━━━━

Thank you for waiting!`,
						thread.threadID
					);
				}
			}

			console.log("✅ Auto restart message sent to all groups.");
		}
		catch (error) {
			console.error("❌ Error sending auto message:", error);
		}
	}
};
