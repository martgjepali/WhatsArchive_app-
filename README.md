# WhatsApp Archive CLI

WhatsApp Archive CLI is a command-line tool designed to extract WhatsApp chat transcripts from a ZIP archive, convert `.opus` audio files to `.mp3`, and generate a structured JSON representation of the chat.

## Features

- **Extract Chat Transcripts**: Convert WhatsApp chat archives into readable JSON format.
- **Media File Conversion**: Convert `.opus` files to `.mp3` for broader compatibility.
- **Customizable Output**: Configure output directories for extracted and converted files.

## Getting Started

These instructions will guide you on how to set up and use the WhatsApp Archive CLI on your local machine for development and testing purposes.

### Prerequisites

Make sure you have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

### Installing

Follow these steps to get your development environment running:

1. **Clone the repository**
   
   ```bash
   git clone https://github.com/your-username/whatsapp_archive_cli.git
   cd whatsapp_archive_cli

2. **Building the Project**

    Before running the CLI, you need to compile the TypeScript files into JavaScript. Execute the following command to build the project: 
    ```bash
    npm run build
    
    This step compiles the TypeScript code into executable JavaScript code in the dist directory.

3. **Usage**
    To use the WhatsApp Archive CLI, you need to run the parse command with appropriate options:
    ```bash
    node dist/index.js parse --input <path_to_zip> --output <output_directory> --me <your_md5_hash> --group
    
    This command will extract the chat data from the specified ZIP archive and output it along with any media conversions into the ./output directory.