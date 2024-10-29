import { Command } from "commander";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { parseChatFile } from "../utils/chatParser";

export function registerParseCommand(program: Command): void {
  program
    .command("parse")
    .description("Extract chat transcript and media files from a ZIP archive")
    .requiredOption(
      "--input <path>",
      "Path to the ZIP archive containing chat transcript and media files"
    )
    .requiredOption(
      "--output <path>",
      "Path to the output folder where the results will be saved"
    )
    .option("-m, --me <hash>", "Specify your unique hash identifier")
    .option("-g, --group", "Indicate if the chat is a group chat", false)
    .action((options) => {
      // Validate the input file existence
      if (!fs.existsSync(options.input)) {
        console.error(
          `Error: The input file at "${options.input}" does not exist.`
        );
        process.exit(1);
      }

      // Ensure the output directory exists
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      // Extract ZIP archive
      extractZipArchive(options.input, options.output);

      // Find the chat transcript file in the output folder
      const chatFile = findChatTranscript(options.output);
      if (!chatFile) {
        console.error("Error: No chat transcript found in the ZIP archive.");
        process.exit(1);
      }

      console.log(`Found chat transcript: ${chatFile}`);

      // Validate meHash
      if (!validateMd5(options.me)) {
        console.error("Error: The provided meHash is not a valid MD5 hash.");
        process.exit(1);
      }

      // Parse the chat transcript
      try {
        const chatLog = parseChatFile(chatFile, options.me, options.group);
        const outputFilePath = path.join(options.output, "chat.json");
        fs.writeFileSync(
          outputFilePath,
          JSON.stringify(chatLog, null, 2),
          "utf8"
        );
        console.log(`Chat transcript parsed and saved to ${outputFilePath}`);
      } catch (error) {
        console.error(
          "Error processing the chat file:",
          error instanceof Error ? error.message : "Unknown error"
        );
        process.exit(1);
      }
    });
}

// Function to extract ZIP archive
function extractZipArchive(inputPath: string, outputPath: string): void {
  try {
    const zip = new AdmZip(inputPath);
    zip.extractAllTo(outputPath, true);
    console.log(`Successfully extracted ZIP contents to: ${outputPath}`);
  } catch (error) {
    console.error("Error extracting ZIP archive:", error);
    process.exit(1);
  }
}

// Function to find chat transcript in the output folder
function findChatTranscript(outputFolder: string): string | null {
  const files = fs.readdirSync(outputFolder);
  const chatFile = files.find((file) => file.endsWith(".txt"));
  return chatFile ? path.join(outputFolder, chatFile) : null;
}

// Function to validate MD5 hash
function validateMd5(hash: string): boolean {
  return /^[a-f0-9]{32}$/i.test(hash);
}
