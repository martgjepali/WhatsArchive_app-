// parseCommand.ts

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
    .addHelpText(
      "after",
      `
Examples:
  $ cli-tool parse --input ./chat.zip --output ./output --me d41d8cd98f00b204e9800998ecf8427e --group
  $ cli-tool parse --input /path/to/chat.zip --output /path/to/output
  $ cli-tool parse --input ./chat.zip --output ./output --verbose
      `
    )
    .action(async (options) => {
      // Make the action handler asynchronous
      try {
        // Resolve paths to absolute paths
        const inputPath = path.resolve(options.input);
        const outputPath = path.resolve(options.output);

        // Validate the input file existence
        if (!fs.existsSync(inputPath)) {
          console.error(
            `Error: The input file at "${inputPath}" does not exist.`
          );
          process.exit(1);
        }

        // Ensure the output directory exists
        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
        }

        // Extract ZIP archive
        extractZipArchive(inputPath, outputPath);

        // Find the chat transcript file in the output folder
        const chatFile = findChatTranscript(outputPath);
        if (!chatFile) {
          console.error("Error: No chat transcript found in the ZIP archive.");
          process.exit(1);
        }

        console.log(`Found chat transcript: ${chatFile}`);

        // Validate meHash if provided
        if (options.me && !validateMd5(options.me)) {
          console.error("Error: The provided meHash is not a valid MD5 hash.");
          process.exit(1);
        }

        // Parse the chat transcript
        const chatLog = await parseChatFile(
          chatFile,
          options.me,
          options.group,
          outputPath
        );
        const outputFilePath = path.join(outputPath, "chat.json");
        fs.writeFileSync(
          outputFilePath,
          JSON.stringify(chatLog, null, 2),
          "utf8"
        );
        console.log(`Chat transcript parsed and saved to ${outputFilePath}`);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error processing the chat file:", error.message);
        } else {
          console.error(
            "An unknown error occurred while processing the chat file."
          );
        }
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error extracting ZIP archive:", error.message);
    } else {
      console.error("An unknown error occurred during ZIP extraction.");
    }
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
