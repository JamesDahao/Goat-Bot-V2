const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register"],
    version: "1.0",
    author: "James",
    role: 0,
    description: "Register random accounts",
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
      return message.reply("Usage: /reg PH 10 10385111");
    }

    const results = [];

    for (let i = 0; i < count; i++) {
      const phone = randomPhone(country);
      const deviceId = `android_${uuidv4()}`;

      const proxyUser = `country-${country}:17e3dd22-29f1-4435-a876-2ea72fea1a74`;
      const proxyHost = "http://proxy.proxyverse.io:9200";
      const agent = new HttpsProxyAgent(`http://${proxyUser}@${proxyHost}`);

      const payload = new URLSearchParams({
        language: "en-us",
        token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NjcwMzU4MDEsImRhdGEiOnsidXNlcmlkIjoxMDM3OTIwNH19.xqyjRx-nFc4HI3bdFCgERdoO00qhY6_EobTIh-9X6e8",
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
        area: country === "PH" ? "63" : "84",
        tel: phone,
        pwd: "Haha1234",
        pwd_confirmation: "Haha1234",
        login_source: "0",
        ghana_info: "undefined"
      });

      try {
        const response = await axios.post(
          "https://api.api-pba1.com/login/register",
          payload.toString(),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            httpsAgent: agent,
            timeout: 15000
          }
        );

        // Get the IP used (the proxy host)
        const ipUsed = proxyHost.replace("http://", "");

        results.push(`✅ ${phone} | IP: ${ipUsed} | Response: ${JSON.stringify(response.data)}`);
      } catch (err) {
        const ipUsed = proxyHost.replace("http://", "");
        results.push(`❌ ${phone} | IP: ${ipUsed} | Error: ${JSON.stringify(err.response?.data || err.message)}`);
      }
    }

    message.reply(
      `📋 Registration Result (${country})\n\n` + results.join("\n")
    );
  }
};

/* ---------------- HELPERS ---------------- */

function randomPhone(country) {
  if (country === "PH") return "63" + "9" + randDigits(9);

  if (country === "VN") {
    const prefixes = ["3", "5", "7", "8", "9"];
    return "84" + prefixes[Math.floor(Math.random() * prefixes.length)] + randDigits(8);
  }
}

function randDigits(len) {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
  return out;
}
