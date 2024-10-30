// chatParse.ts

import fs from "fs";
import moment from "moment";
import { createHash } from "crypto";
import path from "path";
import { convertOpusToMp3 } from "../utils/convertOpusToMp3"; // Adjust the import path as necessary

type ChatMessage = {
  type: "msg" | "dchange" | "notification";
  index: number;
  tstamp: number;
  hour?: string;
  person?: string;
  message: string;
  date?: string;
  fromMe?: boolean;
  attachment?: string; // Optional field for attachments
};

type ChatLog = {
  groupChat: boolean;
  chatName: string;
  me: string;
  hash: string;
  chatLog: ChatMessage[];
};

export async function parseChatFile(
  filePath: string,
  meHash: string,
  isGroupChat: boolean,
  outputPath: string
): Promise<ChatLog> {
  const content = fs.readFileSync(filePath, "utf8");
  return parseChatContent(content, meHash, isGroupChat, outputPath);
}

async function parseChatContent(
  content: string,
  meHash: string,
  isGroupChat: boolean,
  outputPath: string
): Promise<ChatLog> {
  const lines = content.split("\n");
  const chatMessages: ChatMessage[] = [];
  let dayCache: string | null = null;
  let msgIndex = 0;
  let lastPerson = "Unknown"; // Default to 'Unknown'
  let lastHour = "";
  let inferredChatName = isGroupChat ? "Group Chat" : "Personal Chat";
  let lastTimestamp = Math.floor(Date.now() / 1000); // Default to the current timestamp

  // Update this regex based on your chat transcript's date format
  const dateRegex =
    /^\[(\d{1,2})\.(\d{1,2})\.(\d{2}), (\d{1,2}):(\d{2}):(\d{2})\]/;

  for (const line of lines) {
    console.log(`Processing line: ${line}`); // Diagnostic log

    const match = line.match(dateRegex);

    if (match) {
      console.log(`Matched date: ${match[0]}`); // Diagnostic log

      const [_, day, month, year, hour, minute, second] = match;
      const date = moment(
        `20${year}-${month}-${day} ${hour}:${minute}:${second}`,
        "YYYY-MM-DD HH:mm:ss"
      );
      const timestamp = date.unix();
      const normalizedLine = line.replace(dateRegex, "").trim(); // Remove timestamp

      lastTimestamp = timestamp;
      // Ensure hour is zero-padded
      const formattedHour = `${hour.padStart(2, "0")}:${minute.padStart(
        2,
        "0"
      )}`;
      lastHour = formattedHour;

      const attachmentMatch = normalizedLine.match(/<attached: (.+)>/);
      if (attachmentMatch) {
        const attachment = attachmentMatch[1];
        const originalAttachmentPath = path.resolve(
          outputPath,
          attachment.trim()
        );

        // Determine if the attachment is an Opus file
        const ext = path.extname(originalAttachmentPath).toLowerCase();
        let finalAttachmentPath = originalAttachmentPath;

        if (ext === ".opus") {
          // Define the path for the converted MP3 file
          finalAttachmentPath = originalAttachmentPath.replace(
            /\.opus$/i,
            ".mp3"
          );

          try {
            console.log(`Converting ${originalAttachmentPath} to MP3...`); // Diagnostic log
            await convertOpusToMp3(originalAttachmentPath, finalAttachmentPath);
          } catch (conversionError: unknown) {
            if (conversionError instanceof Error) {
              console.error(`Conversion failed: ${conversionError.message}`);
            } else {
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
        if (fs.existsSync(finalAttachmentPath)) {
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
        } else {
          console.warn(
            `Warning: Attachment file not found at ${finalAttachmentPath}`
          );
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
      } else {
        const messageRegex = /^([^:]+): (.*)$/;
        const messageMatch = normalizedLine.match(messageRegex);

        if (messageMatch) {
          const [__, person, message] = messageMatch;
          const fromMe =
            createHash("md5").update(person).digest("hex") === meHash;
          lastPerson = person; // Update last known sender

          if (!isGroupChat && !fromMe) inferredChatName = person;

          if (dayCache !== date.format("YYYY-MM-DD")) {
            dayCache = date.format("YYYY-MM-DD");
            chatMessages.push({
              type: "dchange",
              index: msgIndex++,
              tstamp: timestamp,
              date: date.format("D MMMM YYYY"),
              message: `Date changed to ${date.format("D MMMM YYYY")}`,
            });
            console.log(
              `Added date change message for: ${date.format("D MMMM YYYY")}`
            ); // Diagnostic log
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
        } else {
          chatMessages.push({
            type: "notification",
            index: msgIndex++,
            tstamp: timestamp,
            message: normalizedLine,
          });
          console.log(`Added notification: ${normalizedLine}`); // Diagnostic log
        }
      }
    } else {
      const attachmentMatch = line.match(/<attached: (.+)>/);
      if (attachmentMatch) {
        const attachment = attachmentMatch[1];
        const originalAttachmentPath = path.resolve(
          outputPath,
          attachment.trim()
        );

        // Determine if the attachment is an Opus file
        const ext = path.extname(originalAttachmentPath).toLowerCase();
        let finalAttachmentPath = originalAttachmentPath;

        if (ext === ".opus") {
          // Define the path for the converted MP3 file
          finalAttachmentPath = originalAttachmentPath.replace(
            /\.opus$/i,
            ".mp3"
          );

          try {
            console.log(`Converting ${originalAttachmentPath} to MP3...`); // Diagnostic log
            await convertOpusToMp3(originalAttachmentPath, finalAttachmentPath);
          } catch (conversionError: unknown) {
            if (conversionError instanceof Error) {
              console.error(`Conversion failed: ${conversionError.message}`);
            } else {
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
        if (fs.existsSync(finalAttachmentPath)) {
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
        } else {
          console.warn(
            `Warning: Attachment file not found at ${finalAttachmentPath}`
          );
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
      } else if (line.trim()) {
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

  const hash = createHash("md5")
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
