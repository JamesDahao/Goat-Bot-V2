const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  config: {
    name: "reg",
    aliases: ["register"],
    version: "1.1",
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
      const ip = country === "PH" ? randomPHIP() : randomVNIP();

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
          area: country === "PH" ? "63" : "84",
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
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Forwarded-For": ip,
              "X-Real-IP": ip
            },
            timeout: 15000
          }
        );

        results.push(
          `📶 ${phone}\nℹ️ ${ip}\n✅ ${JSON.stringify(res.data)}`
        );
      } catch (err) {
        results.push(
          `📶 ${phone}\nℹ️ ${ip}\n❌ ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`
        );
      }
    }

    message.reply(
      `📋 Registration Result (${country})\n\n` + results.join("\n\n")
    );
  }
};

/* ================= HELPERS ================= */

function randomPhone(country) {
  if (country === "PH") {
    return "63" + "9" + randDigits(9);
  }

  if (country === "VN") {
    const prefixes = ["3", "5", "7", "8", "9"];
    return "84" + prefixes[Math.floor(Math.random() * prefixes.length)] + randDigits(8);
  }
}

function randDigits(len) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

/* ===== PH IP GENERATOR (FIXED) ===== */

function randomPHIP() {
  const ranges = [
    { start: [27, 72, 0, 0], end: [27, 72, 255, 255] },
    { start: [175, 136, 0, 0], end: [175, 136, 255, 255] },
    { start: [180, 190, 0, 0], end: [180, 190, 255, 255] },
    { start: [202, 57, 0, 0], end: [202, 57, 255, 255] }
  ];

  const r = ranges[Math.floor(Math.random() * ranges.length)];

  return [
    rand(r.start[0], r.end[0]),
    rand(r.start[1], r.end[1]),
    rand(r.start[2], r.end[2]),
    rand(r.start[3], r.end[3])
  ].join(".");
}

/* ===== VN IP (OPTIONAL) ===== */

function randomVNIP() {
  const ranges = [
    { start: [14, 160, 0, 0], end: [14, 191, 255, 255] },
    { start: [27, 64, 0, 0], end: [27, 79, 255, 255] }
  ];

  const r = ranges[Math.floor(Math.random() * ranges.length)];

  return [
    rand(r.start[0], r.end[0]),
    rand(r.start[1], r.end[1]),
    rand(r.start[2], r.end[2]),
    rand(r.start[3], r.end[3])
  ].join(".");
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
