const fs = require("fs-extra");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

const doNotDelete = "[ 🤖 | James Bot ]";

module.exports = {
	config: {
		name: "help",
		version: "2.6",
		author: "James Dahao",
		countDown: 5,
		role: 1,
		description: {
			en: "View all commands and usage"
		},
		category: "info",
		guide: {
			en: "{pn} [page]\n{pn} <command name>"
		}
	},

	langs: {
		en: {
			noPermission: "⚠️ Only group admins and bot admins can use this command.",
			pageNotFound: "⚠️ Page %1 does not exist.",
			commandNotFound: "⚠️ Command \"%1\" not found.",
			helpList:
				"╔═════•| 🤖 |•═════╗\n" +
				" James Bot\n" +
				"╚═════•| 🤖 |•═════╝\n\n" +
				"📜 PAGE %1/%2 📜\n\n" +
				"%3",
			commandInfo:
				"╔═════•| 📖 |•═════╗\n" +
				" COMMAND INFORMATION\n" +
				"╚═════•| 📖 |•═════╝\n\n" +
				"🔹 Name: %1\n" +
				"🔹 Description: %2\n" +
				"🔹 Role: %3\n" +
				"🔹 Version: %4\n" +
				"🔹 Author: %5\n\n" +
				"💡 Usage:\n%6\n\n"
		}
	},

	onStart: async function ({ message, args, event, threadsData, getLang, role, isBotAdmin }) {
		const { threadID, senderID } = event;
		const threadData = await threadsData.get(threadID);
		const groupAdmins = threadData?.adminIDs || [];
		const isGroupAdmin = groupAdmins.includes(senderID);

		if (!isGroupAdmin && !isBotAdmin)
			return message.reply(getLang("noPermission"));

		const prefix = getPrefix(threadID);
		const pageNum = parseInt(args[0]);
		const isPage = !isNaN(pageNum);

		if (!args[0] || isPage) {
			let arrayInfo = [];
			for (const [name, value] of commands) {
				if (value.config.role > 1 && role < value.config.role) continue;
				arrayInfo.push(name);
			}
			arrayInfo.sort();

			const page = isPage ? pageNum : 1;
			const numberOfOnePage = 20;
			const totalPage = Math.ceil(arrayInfo.length / numberOfOnePage);

			if (page < 1 || page > totalPage)
				return message.reply(getLang("pageNotFound", page));

			const start = (page - 1) * numberOfOnePage;
			const end = start + numberOfOnePage;
			const listPage = arrayInfo.slice(start, end);

			let textList = "";
			listPage.forEach((cmd, index) => {
				textList += `│ ▪ ${start + index + 1} ➩ ${cmd}\n`;
			});

			return message.reply(getLang("helpList", page, totalPage, textList));
		}

		const cmdName = args[0].toLowerCase();
		let command = commands.get(cmdName) || commands.get(aliases.get(cmdName));
		if (!command)
			return message.reply(getLang("commandNotFound", args[0]));

		const cfg = command.config;
		const usage = (cfg.guide?.en || cfg.guide || "").replace(/\{pn\}/g, prefix + cfg.name);
		const roleText =
			cfg.role == 0 ? "0 (All users)" :
			cfg.role == 1 ? "1 (Group admin)" :
			"2 (Bot admin)";

		return message.reply(
			getLang("commandInfo",
				cfg.name,
				cfg.description?.en || cfg.description || "No description",
				roleText,
				cfg.version || "1.0",
				cfg.author || "Unknown",
				usage || "No usage guide"
			)
		);
	}
};
