// index.ts
import { program } from "commander";
import { registerParseCommand } from "./commands/parseCommand";

program
  .version("1.0.0")
  .description("CLI tool to transform WhatsApp chat transcripts into JSON");

// Register the parse command with all its options and logic
registerParseCommand(program);

// Parse the command-line arguments
program.parse(process.argv);
