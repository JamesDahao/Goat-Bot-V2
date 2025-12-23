const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register"],
    version: "1.1",
    author: "James",
    role: 0,
    description: "Register accounts (debug mode)",
    category: "box chat",
    guide: {
      en: "{pn} <PH|VN> <count> <agentid>"
    }
  },

  onStart: async function ({ message, args }) {
    const country = (args[0] || "").toUpperCase();
    const count = parseInt(args[1]);
    const agentid = args[2];

    if (!["PH", "VN"].includes(country) || !count || !agentid) {
      return message.reply("Usage: /reg PH 1 10600964");
    }

    const results = [];

    // ✅ Correct proxy format
    const proxyUser = `country-${country}:17e3dd22-29f1-4435-a876-2ea72fea1a74`;
    const proxyHost = "proxy.proxyverse.io:9200";
    const proxyUrl = `http://${proxyUser}@${proxyHost}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    for (let i = 0; i < count; i++) {
      const phone = randomPhone(country);
      const deviceId = `android_${uuidv4()}`;

      try {
        // 🔍 Get real outgoing IP
        const ipRes = await axios.get("https://api.ipify.org?format=json", {
          httpsAgent: agent,
          timeout: 10000
        });

        const payload = new URLSearchParams({
          language: "en-us",
          token: "",
          sys_api_version: "2",
          login_type: "1",
          mainVer: "1",
          subVer: "1",
          pkgName: "h5_client",
          platform: "android",
          deviceid: deviceId,
          device_id: deviceId,
          agentid,
          firstInstall: "false",
          Type: "101",
          dataVersion: "1766430001",
          nativeVer: "0",
          domain: "https://api.api-pba1.com",
          loadLocation: "https://www.pbawin9.com/",
          os: "Android",
          area: country === "PH" ? "63" : "84",
          tel: phone,
          pwd: "Haha1234",
          pwd_confirmation: "Haha1234",
          login_source: "0"
        });

        const res = await axios.post(
          "https://api.api-pba1.com/login/register",
          payload.toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            httpsAgent: agent,
            timeout: 15000
          }
        );

        results.push(
          `✅ ${phone}\nIP: ${ipRes.data.ip}\nResponse: ${JSON.stringify(res.data)}`
        );

      } catch (err) {
        results.push(
          `❌ ${phone}\nError: ${JSON.stringify(err.response?.data || err.message)}`
        );
      }
    }

    message.reply(`📋 Registration Result (${country})\n\n${results.join("\n\n")}`);
  }
};

/* -------- HELPERS -------- */

function randomPhone(country) {
  if (country === "PH") return "63" + "9" + randDigits(9);
  if (country === "VN") return "84" + ["3","5","7","8","9"][Math.floor(Math.random()*5)] + randDigits(8);
}

function randDigits(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}
