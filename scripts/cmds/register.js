const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { HttpsProxyAgent } = require("https-proxy-agent");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register"],
    version: "1.4",
    author: "James",
    role: 0,
    description: "Register random accounts using PH proxy",
    category: "box chat",
    guide: {
      en: "{pn} <count> <agentid>"
    }
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

      // ===== PROXY (PHILIPPINES) =====
      const PROXY_USER = "country-philippines:17e3dd22-29f1-4435-a876-2ea72fea1a74";
      const PROXY_HOST = "proxy.proxyverse.io:9200";
      const agent = new HttpsProxyAgent(
        `http://${PROXY_USER}@${PROXY_HOST}`
      );

      try {
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
          agentid: agentid,
          firstInstall: "false",
          Type: "101",
          dataVersion: "1766430001",
          nativeVer: "0",
          domain: "https://api.api-pba1.com",
          loadLocation: "https://www.pbawin9.com/",
          os: "Android",
          area: "63",
          tel: phone,
          pwd: "Haha1234",
          pwd_confirmation: "Haha1234",
          login_source: "0",
          ghana_info: "undefined"
        });

        const res = await axios.post(
          "https://api.api-pba1.com/login/register",
          payload.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            httpsAgent: agent,
            timeout: 20000
          }
        );

        results.push(
          `📶 ${phone}\n✅ ${JSON.stringify(res.data)}`
        );
      } catch (err) {
        results.push(
          `📶 ${phone}\n❌ ${
            err.response?.data
              ? JSON.stringify(err.response.data)
              : err.message
          }`
        );
      }
    }

    message.reply(
      `📋 Registration Result (PH)\n\n` + results.join("\n\n")
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
