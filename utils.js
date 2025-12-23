const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");
const https = require("https");
const agent = new https.Agent({ rejectUnauthorized: false });
const moment = require("moment-timezone");
const mimeDB = require("mime-db");
const _ = require("lodash");
const { google } = require("googleapis");
const ora = require("ora");
const log = require("./logger/log.js");
const { isHexColor, colors } = require("./func/colors.js");
const Prism = require("./func/prism.js");

const { config } = global.GoatBot;
const { gmailAccount } = config.credentials;
const { clientId, clientSecret, refreshToken, apiKey: googleApiKey } = gmailAccount;

if (!clientId || !clientSecret || !refreshToken) {
    log.err("CREDENTIALS", `Please provide valid Gmail credentials in ${path.normalize(global.client.dirConfig)}`);
    process.exit();
}

const oauth2ClientForGGDrive = new google.auth.OAuth2(clientId, clientSecret, "https://developers.google.com/oauthplayground");
oauth2ClientForGGDrive.setCredentials({ refresh_token: refreshToken });
const driveApi = google.drive({ version: 'v3', auth: oauth2ClientForGGDrive });

const word = [
    'A','Á','À','Ả','Ã','Ạ','a','á','à','ả','ã','ạ',
    'Ă','Ắ','Ằ','Ẳ','Ẵ','Ặ','ă','ắ','ằ','ẳ','ẵ','ặ',
    'Â','Ấ','Ầ','Ẩ','Ẫ','Ậ','â','ấ','ầ','ẩ','ẫ','ậ',
    'B','b','C','c','D','Đ','d','đ','E','É','È','Ẻ','Ẽ','Ẹ','e','é','è','ẻ','ẽ','ẹ',
    'Ê','Ế','Ề','Ể','Ễ','Ệ','ê','ế','ề','ể','ễ','ệ','F','f','G','g','H','h','I','Í','Ì','Ỉ','Ĩ','Ị','i','í','ì','ỉ','ĩ','ị',
    'J','j','K','k','L','l','M','m','N','n','O','Ó','Ò','Ỏ','Õ','Ọ','o','ó','ò','ỏ','õ','ọ',
    'Ô','Ố','Ồ','Ổ','Ỗ','Ộ','ô','ố','ồ','ổ','ỗ','ộ','Ơ','Ớ','Ờ','Ở','Ỡ','Ợ','ơ','ớ','ờ','ở','ỡ','ợ',
    'P','p','Q','q','R','r','S','s','T','t','U','Ú','Ù','Ủ','Ũ','Ụ','u','ú','ù','ủ','ũ','ụ',
    'Ư','Ứ','Ừ','Ử','Ữ','Ự','ư','ứ','ừ','ử','ữ','ự','V','v','W','w','X','x','Y','Ý','Ỳ','Ỷ','Ỹ','Ỵ','y','ý','ỳ','ỷ','ỹ','ỵ','Z','z',' '
];

const regCheckURL = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

class CustomError extends Error {
    constructor(obj) {
        if (typeof obj === 'string') obj = { message: obj };
        if (typeof obj !== 'object' || obj === null) throw new TypeError('Object required');
        obj.message ? super(obj.message) : super();
        Object.assign(this, obj);
    }
}

function lengthWhiteSpacesEndLine(text) {
    let length = 0;
    for (let i = text.length - 1; i >= 0; i--) {
        if (text[i] === ' ') length++;
        else break;
    }
    return length;
}

function lengthWhiteSpacesStartLine(text) {
    let length = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') length++;
        else break;
    }
    return length;
}

function setErrorUptime() {
    global.statusAccountBot = 'block spam';
    global.responseUptimeCurrent = global.responseUptimeError;
}

const defaultStderrClearLine = process.stderr.clearLine;

function convertTime(ms, s = "s", m = "m", h = "h", d = "d", M = "M", y = "y", notShowZero = false) {
    if (typeof s === 'boolean') { notShowZero = s; s = "s"; }
    const second = Math.floor(ms / 1000 % 60);
    const minute = Math.floor(ms / 1000 / 60 % 60);
    const hour = Math.floor(ms / 1000 / 60 / 60 % 24);
    const day = Math.floor(ms / 1000 / 60 / 60 / 24 % 30);
    const month = Math.floor(ms / 1000 / 60 / 60 / 24 / 30 % 12);
    const year = Math.floor(ms / 1000 / 60 / 60 / 24 / 30 / 12);
    let formattedDate = '';
    const dateParts = [
        { value: year, replace: y },
        { value: month, replace: M },
        { value: day, replace: d },
        { value: hour, replace: h },
        { value: minute, replace: m },
        { value: second, replace: s }
    ];
    for (let i = 0; i < dateParts.length; i++) {
        const part = dateParts[i];
        if (part.value) formattedDate += part.value + part.replace;
        else if (formattedDate) formattedDate += '00' + part.replace;
        else if (i === dateParts.length - 1) formattedDate += '0' + part.replace;
    }
    if (!formattedDate) formattedDate = '0' + s;
    if (notShowZero) formattedDate = formattedDate.replace(/00\w+/g, '');
    return formattedDate;
}

function createOraDots(text) {
    const spin = new ora({
        text: text,
        spinner: { interval: 80, frames: ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'] }
    });
    spin._start = () => { utils.enableStderrClearLine(false); spin.start(); };
    spin._stop = () => { utils.enableStderrClearLine(true); spin.stop(); };
    return spin;
}

class TaskQueue {
    constructor(callback) { this.queue = []; this.running = null; this.callback = callback; }
    push(task) { this.queue.push(task); if (this.queue.length === 1) this.next(); }
    next() {
        if (!this.queue.length) return;
        const task = this.queue[0];
        this.running = task;
        this.callback(task, async (err, result) => {
            this.running = null; this.queue.shift(); this.next();
        });
    }
    length() { return this.queue.length; }
}

function enableStderrClearLine(isEnable = true) {
    process.stderr.clearLine = isEnable ? defaultStderrClearLine : () => {};
}

function formatNumber(number) {
    if (isNaN(number)) throw new Error('Number required');
    return Number(number).toLocaleString(global.GoatBot.config.language || "en-US");
}

function getExtFromAttachmentType(type) {
    switch(type) {
        case "photo": return "png";
        case "animated_image": return "gif";
        case "video": return "mp4";
        case "audio": return "mp3";
        default: return "txt";
    }
}

function getExtFromMimeType(mimeType = "") {
    return mimeDB[mimeType] ? (mimeDB[mimeType].extensions || [])[0] || "unknow" : "unknow";
}

function getExtFromUrl(url = "") {
    if (!url) throw new Error('URL required');
    const reg = /(?<=https:\/\/cdn.fbsbx.com\/v\/.*?\/|https:\/\/video.xx.fbcdn.net\/v\/.*?\/|https:\/\/scontent.xx.fbcdn.net\/v\/.*?\/).*?(\/|\?)/g;
    const fileName = url.match(reg)[0].slice(0,-1);
    return fileName.slice(fileName.lastIndexOf(".") + 1);
}

function getPrefix(threadID) {
    if (!threadID || isNaN(threadID)) throw new Error('threadID must be a number');
    let prefix = global.GoatBot.config.prefix;
    const threadData = global.db.allThreadData.find(t => t.threadID == threadID);
    if (threadData) prefix = threadData.data.prefix || prefix;
    return prefix;
}

function getTime(timestamps, format) {
    if (!format && typeof timestamps === 'string') { format = timestamps; timestamps = undefined; }
    return moment(timestamps).tz(config.timeZone).format(format);
}

function getType(value) {
    return Object.prototype.toString.call(value).slice(8,-1);
}

function isNumber(value) { return !isNaN(parseFloat(value)); }

function removeHomeDir(fullPath) {
    if (!fullPath) throw new Error('fullPath required');
    return fullPath.replace(new RegExp(process.cwd(), 'g'), '');
}

// <<< MESSAGE HANDLER
function message(api, event) {
    async function sendMessageError(err) {
        const msg = typeof err === "string" ? err : (err.message || JSON.stringify(err));
        return await api.sendMessage(`An error occurred:\n${msg}`, event.threadID, event.messageID);
    }
    return {
        send: async (form, callback) => {
            try { return await api.sendMessage(form, event.threadID, callback); }
            catch (err) { if (JSON.stringify(err).includes('spam')) setErrorUptime(); throw err; }
        },
        reply: async (form, callback) => {
            try { return await api.sendMessage(form, event.threadID, callback, event.messageID); }
            catch (err) { if (JSON.stringify(err).includes('spam')) setErrorUptime(); throw err; }
        },
        unsend: async (messageID, callback) => await api.unsendMessage(messageID, callback),
        reaction: async (emoji, messageID, callback) => {
            try { return await api.setMessageReaction(emoji, messageID, callback, true); }
            catch (err) { if (JSON.stringify(err).includes('spam')) setErrorUptime(); throw err; }
        },
        err: sendMessageError,
        error: sendMessageError
    };
}

// <<< UTILS EXPORT
const utils = {
    CustomError,
    TaskQueue,
    colors,
    convertTime,
    createOraDots,
    defaultStderrClearLine,
    enableStderrClearLine,
    formatNumber,
    getExtFromAttachmentType,
    getExtFromMimeType,
    getExtFromUrl,
    getPrefix,
    getText: require("./languages/makeFuncGetLangs.js"),
    getTime,
    getType,
    isHexColor,
    isNumber,
    removeHomeDir,
    message,
    log,
    Prism,
    // add more as needed...
    error: async (err, api, event) => {
        if (!api || !event) { console.error(err); return; }
        const msg = typeof err === "string" ? err : (err.message || JSON.stringify(err));
        await api.sendMessage(`An error occurred:\n${msg}`, event.threadID, event.messageID);
    }
};

module.exports = utils;
