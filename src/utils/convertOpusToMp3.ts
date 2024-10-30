// utils/convertOpusToMp3.ts

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

/**
 * Converts an Opus audio file to MP3 format.
 * @param inputPath - The absolute path to the input .opus file.
 * @param outputPath - The absolute path where the .mp3 file will be saved.
 * @returns A promise that resolves when the conversion is complete.
 */
export function convertOpusToMp3(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure the input file exists
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Input file does not exist: ${inputPath}`));
    }

    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('error', (err) => {
        reject(new Error(`Error converting ${inputPath} to MP3: ${err.message}`));
      })
      .on('end', () => {
        console.log(`Successfully converted to MP3: ${outputPath}`);
        resolve();
      })
      .save(outputPath);
  });
}
