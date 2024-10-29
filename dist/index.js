"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// index.ts
const commander_1 = require("commander");
const parseCommand_1 = require("./commands/parseCommand");
commander_1.program
    .version("1.0.0")
    .description("CLI tool to transform WhatsApp chat transcripts into JSON");
// Register the parse command with all its options and logic
(0, parseCommand_1.registerParseCommand)(commander_1.program);
// Parse the command-line arguments
commander_1.program.parse(process.argv);
