// ---------- MAIN ----------
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register"],
    version: "1.5",
    author: "James",
    role: 0,
    description: "Register accounts with PH-like IPs",
    category: "box chat",
    guide: { en: "{pn} <PH|VN> <count> <agentid>" }
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
      const fakeIp = country === "PH" ? randomPHIP() : randomIP();

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

// ---------- HELPERS ----------
function randomPhone(country) {
  if (country === "PH") return "63" + "9" + randDigits(9);
  if (country === "VN") {
    const p = ["3","5","7","8","9"];
    return "84" + p[Math.floor(Math.random() * p.length)] + randDigits(8);
  }
}

function randDigits(len) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}

// Random generic IP
function randomIP() {
  return `${r()}.${r()}.${r()}.${r()}`;
}

function r() {
  return Math.floor(Math.random() * 256);
}

// ------------------- PH IPs -------------------
function randomPHIP() {
  // Sample Philippine public IP ranges
  const ranges = [
    { start: [27, 72, 0, 0], end: [27, 72, 255, 255] },
    { start: [180, 190, 0, 0], end: [180, 190, 255, 255] },
    { start: [175, 136, 0, 0], end: [175, 136, 255, 255] },
    { start: [202, 57, 0, 0], end: [202, 57, 255, 255] }
  ];

  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return range.map((s, i) => rand(s, range.end[i])).join(".");
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
