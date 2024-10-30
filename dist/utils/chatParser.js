"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChatFile = parseChatFile;
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const crypto_1 = require("crypto");
function parseChatFile(filePath, meHash, isGroupChat) {
    const content = fs_1.default.readFileSync(filePath, "utf8");
    return parseChatContent(content, meHash, isGroupChat);
}
function parseChatContent(content, meHash, isGroupChat) {
    const lines = content.split("\n");
    const chatMessages = [];
    let dayCache = null;
    let msgIndex = 0;
    let lastPerson = "Unknown"; // Default to 'Unknown'
    let lastHour = "";
    let inferredChatName = isGroupChat ? "Group Chat" : "Personal Chat";
    let lastTimestamp = Date.now() / 1000; // Default to the current timestamp
    lines.forEach((line) => {
        const dateRegex = /^\[(\d{1,2})\.(\d{1,2})\.(\d{2}), (\d{1,2}):(\d{2}):(\d{2})\]/;
        const match = line.match(dateRegex);
        if (match) {
            const [_, day, month, year, hour, minute, second] = match;
            const date = (0, moment_1.default)(`20${year}-${month}-${day} ${hour}:${minute}:${second}`, "YYYY-MM-DD HH:mm:ss");
            const timestamp = date.unix();
            const normalizedLine = line.replace(dateRegex, "").trim(); // Remove timestamp
            lastTimestamp = timestamp;
            lastHour = `${hour}:${minute}`;
            const attachmentMatch = normalizedLine.match(/<attached: (.+)>/);
            if (attachmentMatch) {
                const attachment = attachmentMatch[1];
                chatMessages.push({
                    type: "msg",
                    index: msgIndex++,
                    tstamp: timestamp,
                    hour: lastHour,
                    person: lastPerson, // Use the last known sender
                    message: "Media file attached",
                    attachment: `Users/User/Desktop/WhatsApp_Archive_CLI/output/${attachment.trim()}`, // Formatted path
                });
            }
            else {
                const messageRegex = /^([^:]+): (.*)$/;
                const messageMatch = normalizedLine.match(messageRegex);
                if (messageMatch) {
                    const [__, person, message] = messageMatch;
                    const fromMe = (0, crypto_1.createHash)("md5").update(person).digest("hex") === meHash;
                    lastPerson = person; // Update last known sender
                    if (!isGroupChat && !fromMe)
                        inferredChatName = person;
                    if (dayCache !== date.format("YYYY-MM-DD")) {
                        dayCache = date.format("YYYY-MM-DD");
                        chatMessages.push({
                            type: "dchange",
                            index: msgIndex++,
                            tstamp: timestamp,
                            date: date.format("D MMMM YYYY"),
                            message: `Date changed to ${date.format("D MMMM YYYY")}`,
                        });
                    }
                    chatMessages.push({
                        type: "msg",
                        index: msgIndex++,
                        tstamp: timestamp,
                        hour: lastHour,
                        person: person,
                        message: message,
                        fromMe: fromMe,
                    });
                }
                else {
                    chatMessages.push({
                        type: "notification",
                        index: msgIndex++,
                        tstamp: timestamp,
                        message: normalizedLine,
                    });
                }
            }
        }
        else {
            const attachmentMatch = line.match(/<attached: (.+)>/);
            if (attachmentMatch) {
                const attachment = attachmentMatch[1];
                chatMessages.push({
                    type: "msg",
                    index: msgIndex++,
                    tstamp: lastTimestamp,
                    hour: lastHour,
                    person: lastPerson, // Use the last known sender
                    message: "Media file attached",
                    attachment: `Users/User/Desktop/WhatsApp_Archive_CLI/output/${attachment.trim()}`, // Formatted path
                });
            }
            else if (line.trim()) {
                chatMessages.push({
                    type: "notification",
                    index: msgIndex++,
                    tstamp: lastTimestamp,
                    message: line.trim(),
                });
            }
        }
    });
    const hash = (0, crypto_1.createHash)("md5")
        .update(JSON.stringify(chatMessages))
        .digest("hex");
    return {
        groupChat: isGroupChat,
        chatName: inferredChatName,
        me: meHash,
        hash: hash,
        chatLog: chatMessages,
    };
}
