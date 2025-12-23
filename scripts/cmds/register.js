const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register", "rak"],
    version: "1.7",
    author: "James",
    role: 0,
    description: "Register random accounts",
    category: "box chat",
    guide: { en: "{pn} <count> <agentid>" }
  },

  onStart: async function ({ message, args }) {
    const count = parseInt(args[0]);
    const agentid = args[1];

    if (!count || !agentid) {
      return message.reply("Usage: /reg <count> <agentid>");
    }

    const results = [];

    for (let i = 0; i < count; i++) {
      const phone = randomPHPhone();
      const deviceId = `android_${uuidv4()}`;

      try {
        const payload = new URLSearchParams({
          language: "en-us",
          sys_api_version: "2",
          login_type: "1",
          pkgName: "h5_client",
          platform: "android",
          deviceid: deviceId,
          device_id: deviceId,
          agentid: agentid,
          firstInstall: "false",
          Type: "101",
          dataVersion: "1766430001",
          nativeVer: "0",
          domain: "https://api.api-pba1.com",
          loadLocation: "https://www.pbawin9.com/",
          os: "Android",
          area: "PH",
          tel: phone,
          pwd: "Haha1234",
          pwd_confirmation: "Haha1234",
          login_source: "0"
        });

        const res = await axios.post(
          "https://api.api-pba1.com/login/register",
          payload.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": randomUserAgent()
            },
            timeout: 30000,
            validateStatus: () => true
          }
        );

        results.push(
          `📶 ${phone}\n✅ ${JSON.stringify(res.data)}`
        );
      } catch (err) {
        results.push(
          `📶 ${phone}\n❌ ${err.message}`
        );
      }
    }

    message.reply(
      `📋 Registration Result\n\n${results.join("\n\n")}`
    );
  }
};

/* ================= HELPERS ================= */

function randomPHPhone() {
  return "63" + "9" + randDigits(9);
}

function randDigits(len) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

function randomUserAgent() {
  const agents = [
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-G996B) AppleWebKit/537.36 Chrome/119.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 11; Redmi Note 10) AppleWebKit/537.36 Chrome/118.0.0.0 Mobile Safari/537.36"
  ];
  return agents[Math.floor(Math.random() * agents.length)];
}
