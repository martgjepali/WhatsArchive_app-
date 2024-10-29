import fs from "fs";
import moment from "moment";
import { createHash } from "crypto";

type ChatMessage = {
  type: "msg" | "dchange" | "notification" | "media";
  index: number;
  tstamp: number;
  hour?: string;
  person?: string;
  message: string;
  date?: string;
  fromMe?: boolean;
};

type ChatLog = {
  groupChat: boolean;
  chatName: string;
  me: string;
  hash: string;
  chatLog: ChatMessage[];
};

export function parseChatFile(
  filePath: string,
  meHash: string,
  isGroupChat: boolean
): ChatLog {
  const content = fs.readFileSync(filePath, "utf8");
  return parseChatContent(content, meHash, isGroupChat);
}

function parseChatContent(
  content: string,
  meHash: string,
  isGroupChat: boolean
): ChatLog {
  const lines = content.split("\n");
  const chatMessages: ChatMessage[] = [];
  let dayCache: string | null = null;
  let msgIndex = 0;
  let inferredChatName = isGroupChat ? "Group Chat" : "Personal Chat";
  let lastTimestamp = Date.now() / 1000; // Default to the current timestamp

  lines.forEach((line) => {
    // Regex to match the format: [MM.DD.YY, HH:mm:ss]
    const dateRegex =
      /^\[(\d{1,2})\.(\d{1,2})\.(\d{2}), (\d{1,2}):(\d{2}):(\d{2})\]/;
    const match = line.match(dateRegex);

    if (match) {
      // Extract day, month, year, hour, minute, second
      const [_, day, month, year, hour, minute, second] = match;
      const date = moment(
        `20${year}-${month}-${day} ${hour}:${minute}:${second}`,
        "YYYY-MM-DD HH:mm:ss"
      );
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
      } else {
        // Message regex to identify sender and message
        const messageRegex = /^([^:]+): (.*)$/;
        const messageMatch = normalizedLine.match(messageRegex);

        if (messageMatch) {
          const [__, person, message] = messageMatch;
          const fromMe =
            createHash("md5").update(person).digest("hex") === meHash;

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
        } else {
          // Handle other notifications or system messages
          chatMessages.push({
            type: "notification",
            index: msgIndex++,
            tstamp: timestamp,
            message: normalizedLine,
          });
        }
      }
    } else {
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
      } else if (line.trim()) {
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
