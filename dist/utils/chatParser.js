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
    let inferredChatName = isGroupChat ? "Group Chat" : "Personal Chat";
    let lastTimestamp = Date.now() / 1000; // Default to the current timestamp
    lines.forEach((line) => {
        // Regex to match the format: [MM.DD.YY, HH:mm:ss]
        const dateRegex = /^\[(\d{1,2})\.(\d{1,2})\.(\d{2}), (\d{1,2}):(\d{2}):(\d{2})\]/;
        const match = line.match(dateRegex);
        if (match) {
            // Extract day, month, year, hour, minute, second
            const [_, day, month, year, hour, minute, second] = match;
            const date = (0, moment_1.default)(`20${year}-${month}-${day} ${hour}:${minute}:${second}`, "YYYY-MM-DD HH:mm:ss");
            const timestamp = date.unix();
            const normalizedLine = line.replace(dateRegex, "").trim(); // Remove timestamp
            // Update the last valid timestamp
            lastTimestamp = timestamp;
            // Media attachment regex to match <attached: file_name>
            const mediaRegex = /<attached: (.+)>/;
            const mediaMatch = normalizedLine.match(mediaRegex);
            if (mediaMatch) {
                const mediaFile = mediaMatch[1].trim();
                chatMessages.push({
                    type: "media",
                    index: msgIndex++,
                    tstamp: timestamp,
                    message: mediaFile,
                });
            }
            else {
                // Message regex to identify sender and message
                const messageRegex = /^([^:]+): (.*)$/;
                const messageMatch = normalizedLine.match(messageRegex);
                if (messageMatch) {
                    const [__, person, message] = messageMatch;
                    const fromMe = (0, crypto_1.createHash)("md5").update(person).digest("hex") === meHash;
                    // Infer chat name for personal chat if needed
                    if (!isGroupChat && !fromMe) {
                        inferredChatName = person;
                    }
                    // Add a 'dchange' message if the day changes
                    if (dayCache !== date.format("YYYY-MM-DD")) {
                        dayCache = date.format("YYYY-MM-DD");
                        msgIndex = 0;
                        chatMessages.push({
                            type: "dchange",
                            index: msgIndex++,
                            tstamp: timestamp,
                            date: date.format("D MMMM YYYY"),
                            message: `Date changed to ${date.format("D MMMM YYYY")}`,
                        });
                    }
                    // Add a regular message
                    chatMessages.push({
                        type: "msg",
                        index: msgIndex++,
                        tstamp: timestamp,
                        hour: `${hour}:${minute}`,
                        person,
                        message,
                        fromMe,
                    });
                }
                else {
                    // Handle other notifications or system messages
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
            // Handle lines without timestamps
            const mediaRegex = /<attached: (.+)>/;
            const mediaMatch = line.match(mediaRegex);
            if (mediaMatch) {
                const mediaFile = mediaMatch[1].trim();
                chatMessages.push({
                    type: "media",
                    index: msgIndex++,
                    tstamp: lastTimestamp, // Use the last valid timestamp
                    message: mediaFile,
                });
            }
            else if (line.trim()) {
                // Treat remaining lines as notifications
                chatMessages.push({
                    type: "notification",
                    index: msgIndex++,
                    tstamp: lastTimestamp, // Use the last valid timestamp
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
