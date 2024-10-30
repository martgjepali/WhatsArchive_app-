"use strict";
// parseCommand.ts
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
exports.registerParseCommand = registerParseCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const chatParser_1 = require("../utils/chatParser");
function registerParseCommand(program) {
    program
        .command("parse")
        .description("Extract chat transcript and media files from a ZIP archive")
        .requiredOption("--input <path>", "Path to the ZIP archive containing chat transcript and media files")
        .requiredOption("--output <path>", "Path to the output folder where the results will be saved")
        .option("-m, --me <hash>", "Specify your unique hash identifier")
        .option("-g, --group", "Indicate if the chat is a group chat", false)
        .addHelpText("after", `
Examples:
  $ cli-tool parse --input ./chat.zip --output ./output --me d41d8cd98f00b204e9800998ecf8427e --group
  $ cli-tool parse --input /path/to/chat.zip --output /path/to/output
  $ cli-tool parse --input ./chat.zip --output ./output --verbose
      `)
        .action((options) => __awaiter(this, void 0, void 0, function* () {
        // Make the action handler asynchronous
        try {
            // Resolve paths to absolute paths
            const inputPath = path_1.default.resolve(options.input);
            const outputPath = path_1.default.resolve(options.output);
            // Validate the input file existence
            if (!fs_1.default.existsSync(inputPath)) {
                console.error(`Error: The input file at "${inputPath}" does not exist.`);
                process.exit(1);
            }
            // Ensure the output directory exists
            if (!fs_1.default.existsSync(outputPath)) {
                fs_1.default.mkdirSync(outputPath, { recursive: true });
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
            const chatLog = yield (0, chatParser_1.parseChatFile)(chatFile, options.me, options.group, outputPath);
            const outputFilePath = path_1.default.join(outputPath, "chat.json");
            fs_1.default.writeFileSync(outputFilePath, JSON.stringify(chatLog, null, 2), "utf8");
            console.log(`Chat transcript parsed and saved to ${outputFilePath}`);
        }
        catch (error) {
            if (error instanceof Error) {
                console.error("Error processing the chat file:", error.message);
            }
            else {
                console.error("An unknown error occurred while processing the chat file.");
            }
            process.exit(1);
        }
    }));
}
// Function to extract ZIP archive
function extractZipArchive(inputPath, outputPath) {
    try {
        const zip = new adm_zip_1.default(inputPath);
        zip.extractAllTo(outputPath, true);
        console.log(`Successfully extracted ZIP contents to: ${outputPath}`);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("Error extracting ZIP archive:", error.message);
        }
        else {
            console.error("An unknown error occurred during ZIP extraction.");
        }
        process.exit(1);
    }
}
// Function to find chat transcript in the output folder
function findChatTranscript(outputFolder) {
    const files = fs_1.default.readdirSync(outputFolder);
    const chatFile = files.find((file) => file.endsWith(".txt"));
    return chatFile ? path_1.default.join(outputFolder, chatFile) : null;
}
// Function to validate MD5 hash
function validateMd5(hash) {
    return /^[a-f0-9]{32}$/i.test(hash);
}
