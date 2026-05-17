import axios from 'axios';
import * as fs from 'fs';

export async function downloadFile(url: string, outputPath: string, onProgress: (bytes: number) => void): Promise<void> {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });

  response.data.on('data', (chunk: Buffer) => {
    writer.write(chunk);
    onProgress(chunk.length);
  });

  return new Promise((resolve, reject) => {
    response.data.on('end', () => {
      writer.end();
      resolve();
    });
    response.data.on('error', reject);
    writer.on('error', reject);
  });
}
