const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { HttpsProxyAgent } = require("https-proxy-agent");
const http = require("http");
const https = require("https");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register"],
    version: "1.6",
    author: "James",
    role: 0,
    description: "Register random accounts using PH proxy",
    category: "box chat",
    guide: { en: "{pn} <count> <agentid>" }
  },

  onStart: async function ({ message, args }) {
    const count = parseInt(args[0]);
    const agentid = args[1];

    if (!count || !agentid) {
      return message.reply("Usage: /reg 1 10385111");
    }

    const results = [];

    for (let i = 0; i < count; i++) {
      const phone = randomPHPhone();
      const deviceId = `android_${uuidv4()}`;

      // ===== PROXY =====
      const PROXY_USER = "country-philippines:17e3dd22-29f1-4435-a876-2ea72fea1a74";
      const PROXY_HOST = "proxy.proxyverse.io:9200";
      const proxyUrl = `http://${PROXY_USER}@${PROXY_HOST}`;

      const proxyAgent = new HttpsProxyAgent(proxyUrl);

      try {
        const payload = new URLSearchParams({
          language: "en-us",
          sys_api_version: "2",
          login_type: "1",
          pkgName: "h5_client",
          platform: "android",
          deviceid: deviceId,
          agentid: agentid,
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

            // 🔥 CRITICAL FIXES
            proxy: false,
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
            timeout: 30000,
            validateStatus: () => true
          }
        );

        results.push(`📶 ${phone}\n✅ ${JSON.stringify(res.data)}`);
      } catch (err) {
        results.push(`📶 ${phone}\n❌ ${err.message}`);
      }
    }

    message.reply(`📋 Registration Result (PH)\n\n${results.join("\n\n")}`);
  }
};

/* ================= HELPERS ================= */

function randomPHPhone() {
  return "63" + "9" + randDigits(9);
}

function randDigits(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}

function randomUserAgent() {
  const ua = [
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; SM-G996B) AppleWebKit/537.36 Chrome/119.0.0.0 Mobile Safari/537.36"
  ];
  return ua[Math.floor(Math.random() * ua.length)];
}
