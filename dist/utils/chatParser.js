"use strict";
// chatParse.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChatFile = parseChatFile;
const fs_1 = __importDefault(require("fs"));
const moment_1 = __importDefault(require("moment"));
const crypto_1 = require("crypto");
const path_1 = __importDefault(require("path"));
const convertOpusToMp3_1 = require("../utils/convertOpusToMp3"); // Adjust the import path as necessary
function parseChatFile(filePath, meHash, isGroupChat, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const content = fs_1.default.readFileSync(filePath, "utf8");
        return parseChatContent(content, meHash, isGroupChat, outputPath);
    });
}
function parseChatContent(content, meHash, isGroupChat, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const lines = content.split("\n");
        const chatMessages = [];
        let dayCache = null;
        let msgIndex = 0;
        let lastPerson = "Unknown"; // Default to 'Unknown'
        let lastHour = "";
        let inferredChatName = isGroupChat ? "Group Chat" : "Personal Chat";
        let lastTimestamp = Math.floor(Date.now() / 1000); // Default to the current timestamp
        // Update this regex based on your chat transcript's date format
        const dateRegex = /^\[(\d{1,2})\.(\d{1,2})\.(\d{2}), (\d{1,2}):(\d{2}):(\d{2})\]/;
        for (const line of lines) {
            console.log(`Processing line: ${line}`); // Diagnostic log
            const match = line.match(dateRegex);
            if (match) {
                console.log(`Matched date: ${match[0]}`); // Diagnostic log
                const [_, day, month, year, hour, minute, second] = match;
                const date = (0, moment_1.default)(`20${year}-${month}-${day} ${hour}:${minute}:${second}`, "YYYY-MM-DD HH:mm:ss");
                const timestamp = date.unix();
                const normalizedLine = line.replace(dateRegex, "").trim(); // Remove timestamp
                lastTimestamp = timestamp;
                // Ensure hour is zero-padded
                const formattedHour = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
                lastHour = formattedHour;
                const attachmentMatch = normalizedLine.match(/<attached: (.+)>/);
                if (attachmentMatch) {
                    const attachment = attachmentMatch[1];
                    const originalAttachmentPath = path_1.default.resolve(outputPath, attachment.trim());
                    // Determine if the attachment is an Opus file
                    const ext = path_1.default.extname(originalAttachmentPath).toLowerCase();
                    let finalAttachmentPath = originalAttachmentPath;
                    if (ext === ".opus") {
                        // Define the path for the converted MP3 file
                        finalAttachmentPath = originalAttachmentPath.replace(/\.opus$/i, ".mp3");
                        try {
                            console.log(`Converting ${originalAttachmentPath} to MP3...`); // Diagnostic log
                            yield (0, convertOpusToMp3_1.convertOpusToMp3)(originalAttachmentPath, finalAttachmentPath);
                        }
                        catch (conversionError) {
                            if (conversionError instanceof Error) {
                                console.error(`Conversion failed: ${conversionError.message}`);
                            }
                            else {
                                console.error("An unknown error occurred during conversion.");
                            }
                            // Optionally, you can choose to skip adding this attachment or add it with an error message
                            chatMessages.push({
                                type: "msg",
                                index: msgIndex++,
                                tstamp: timestamp,
                                hour: lastHour,
                                person: lastPerson, // Use the last known sender
                                message: "Media file attached (conversion failed)",
                                attachment: originalAttachmentPath, // Reference original if conversion failed
                            });
                            continue; // Skip to the next line
                        }
                        // Optionally, remove the original .opus file after conversion
                        // fs.unlinkSync(originalAttachmentPath);
                    }
                    // Verify if the attachment file exists
                    if (fs_1.default.existsSync(finalAttachmentPath)) {
                        chatMessages.push({
                            type: "msg",
                            index: msgIndex++,
                            tstamp: timestamp,
                            hour: lastHour,
                            person: lastPerson, // Use the last known sender
                            message: "Media file attached",
                            attachment: finalAttachmentPath,
                        });
                        console.log(`Added message with attachment: ${finalAttachmentPath}`); // Diagnostic log
                    }
                    else {
                        console.warn(`Warning: Attachment file not found at ${finalAttachmentPath}`);
                        chatMessages.push({
                            type: "msg",
                            index: msgIndex++,
                            tstamp: timestamp,
                            hour: lastHour,
                            person: lastPerson,
                            message: "Media file attached (file missing)",
                            attachment: finalAttachmentPath,
                        });
                    }
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
                            console.log(`Added date change message for: ${date.format("D MMMM YYYY")}`); // Diagnostic log
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
                        console.log(`Added message from ${person}: ${message}`); // Diagnostic log
                    }
                    else {
                        chatMessages.push({
                            type: "notification",
                            index: msgIndex++,
                            tstamp: timestamp,
                            message: normalizedLine,
                        });
                        console.log(`Added notification: ${normalizedLine}`); // Diagnostic log
                    }
                }
            }
            else {
                const attachmentMatch = line.match(/<attached: (.+)>/);
                if (attachmentMatch) {
                    const attachment = attachmentMatch[1];
                    const originalAttachmentPath = path_1.default.resolve(outputPath, attachment.trim());
                    // Determine if the attachment is an Opus file
                    const ext = path_1.default.extname(originalAttachmentPath).toLowerCase();
                    let finalAttachmentPath = originalAttachmentPath;
                    if (ext === ".opus") {
                        // Define the path for the converted MP3 file
                        finalAttachmentPath = originalAttachmentPath.replace(/\.opus$/i, ".mp3");
                        try {
                            console.log(`Converting ${originalAttachmentPath} to MP3...`); // Diagnostic log
                            yield (0, convertOpusToMp3_1.convertOpusToMp3)(originalAttachmentPath, finalAttachmentPath);
                        }
                        catch (conversionError) {
                            if (conversionError instanceof Error) {
                                console.error(`Conversion failed: ${conversionError.message}`);
                            }
                            else {
                                console.error("An unknown error occurred during conversion.");
                            }
                            // Optionally, you can choose to skip adding this attachment or add it with an error message
                            chatMessages.push({
                                type: "msg",
                                index: msgIndex++,
                                tstamp: lastTimestamp,
                                hour: lastHour,
                                person: lastPerson, // Use the last known sender
                                message: "Media file attached (conversion failed)",
                                attachment: originalAttachmentPath, // Reference original if conversion failed
                            });
                            continue; // Skip to the next line
                        }
                        // Optionally, remove the original .opus file after conversion
                        // fs.unlinkSync(originalAttachmentPath);
                    }
                    // Verify if the attachment file exists
                    if (fs_1.default.existsSync(finalAttachmentPath)) {
                        chatMessages.push({
                            type: "msg",
                            index: msgIndex++,
                            tstamp: lastTimestamp,
                            hour: lastHour,
                            person: lastPerson, // Use the last known sender
                            message: "Media file attached",
                            attachment: finalAttachmentPath,
                        });
                        console.log(`Added message with attachment: ${finalAttachmentPath}`); // Diagnostic log
                    }
                    else {
                        console.warn(`Warning: Attachment file not found at ${finalAttachmentPath}`);
                        chatMessages.push({
                            type: "msg",
                            index: msgIndex++,
                            tstamp: lastTimestamp,
                            hour: lastHour,
                            person: lastPerson,
                            message: "Media file attached (file missing)",
                            attachment: finalAttachmentPath,
                        });
                    }
                }
                else if (line.trim()) {
                    chatMessages.push({
                        type: "notification",
                        index: msgIndex++,
                        tstamp: lastTimestamp,
                        message: line.trim(),
                    });
                    console.log(`Added notification: ${line.trim()}`); // Diagnostic log
                }
            }
        }
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
    });
}
