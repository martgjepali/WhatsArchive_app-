"use strict";
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
        .action((options) => {
        // Validate the input file existence
        if (!fs_1.default.existsSync(options.input)) {
            console.error(`Error: The input file at "${options.input}" does not exist.`);
            process.exit(1);
        }
        // Ensure the output directory exists
        if (!fs_1.default.existsSync(options.output)) {
            fs_1.default.mkdirSync(options.output, { recursive: true });
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
            const chatLog = (0, chatParser_1.parseChatFile)(chatFile, options.me, options.group);
            const outputFilePath = path_1.default.join(options.output, "chat.json");
            fs_1.default.writeFileSync(outputFilePath, JSON.stringify(chatLog, null, 2), "utf8");
            console.log(`Chat transcript parsed and saved to ${outputFilePath}`);
        }
        catch (error) {
            console.error("Error processing the chat file:", error instanceof Error ? error.message : "Unknown error");
            process.exit(1);
        }
    });
}
// Function to extract ZIP archive
function extractZipArchive(inputPath, outputPath) {
    try {
        const zip = new adm_zip_1.default(inputPath);
        zip.extractAllTo(outputPath, true);
        console.log(`Successfully extracted ZIP contents to: ${outputPath}`);
    }
    catch (error) {
        console.error("Error extracting ZIP archive:", error);
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
