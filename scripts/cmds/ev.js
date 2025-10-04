module.exports = {
  config: {
    name: "ev",
    version: "1.0",
    author: "James Dahao",
    countDown: 5,
    role: 1,
    description: {
      en: "Tag @everyone in your group chat"
    },
    category: "box chat",
    guide: {
      en: "   {pn} [content | empty]"
    }
  },

  onStart: async function ({ message, event, args }) {
    const body = args.join(" ") || "@everyone";
    message.reply({
      body,
      mentions: {
        [event.threadID]: "@everyone"
      }
    });
  }
};
