const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register"],
    version: "1.4",
    author: "James",
    role: 0,
    description: "Register accounts",
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
      return message.reply("Usage: /reg PH 1 10376219");
    }

    const results = [];

    for (let i = 0; i < count; i++) {
      const phone = randomPhone(country);
      const deviceId = `android_${uuidv4()}`;
      const fakeIp = randomIP(); // random IP per account

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
        recaptcha: "",
        verify_img_params: "",
        code: "",
        loadLocation: "https://www.pbawin9.com/",
        link_source: "",
        source_type: "",
        os: "Android",
        area: country === "PH" ? "63" : "84",
        tel: phone,
        pwd: "Haha1234",
        pwd_confirmation: "Haha1234",
        login_source: "0",
        ghana_info: "undefined"
      });

      try {
        const res = await axios.post(
          "https://api.api-pba1.com/login/register",
          payload.toString(),
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Forwarded-For": fakeIp,
              "X-Real-IP": fakeIp
            },
            timeout: 15000
          }
        );

        results.push(
          `📶 ${phone}\nℹ️ ${fakeIp}\n✅ ${JSON.stringify(res.data)}`
        );

      } catch (err) {
        results.push(
          `📶 ${phone}\nℹ️ ${fakeIp}\n❌ ${JSON.stringify(err.response?.data || err.message)}`
        );
      }
    }

    message.reply(`📋 Registration Result (${country})\n\n${results.join("\n\n")}`);
  }
};

/* ---------- HELPERS ---------- */

function randomPhone(country) {
  if (country === "PH") return "63" + "9" + randDigits(9);
  if (country === "VN") {
    const p = ["3","5","7","8","9"];
    return "84" + p[Math.floor(Math.random() * p.length)] + randDigits(8);
  }
}

function randDigits(len) {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10);
  return out;
}

// Random IPv4 (header-only)
function randomIP() {
  return `${r()}.${r()}.${r()}.${r()}`;
}

function r() {
  return Math.floor(Math.random() * 256);
}
