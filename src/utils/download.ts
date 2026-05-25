import axios from 'axios';
import * as fs from 'fs';

export async function downloadFile(url: string, outputPath: string, onProgress: (bytes: number) => void): Promise<void> {
  let writer: fs.WriteStream | null = null;
  let response: any = null;

  try {
    writer = fs.createWriteStream(outputPath);
    response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000 // 30 second timeout
    });
  } catch (error) {
    console.error(`Download initialization error for ${url}:`, (error as Error).message);
    console.error((error as Error).stack);
    if (writer && !writer.closed) {
      writer.close();
    }
    throw error;
  }

  return new Promise((resolve, reject) => {
    let cleanup = () => {
      if (writer && !writer.closed) {
        writer.close();
      }
      if (response.data && !response.data.destroyed) {
        response.data.destroy();
      }
    };

    response.data.on('data', (chunk: Buffer) => {
      try {
        const canWrite = writer.write(chunk);
        onProgress(chunk.length);
        
        if (!canWrite) {
          response.data.pause();
          writer.once('drain', () => {
            response.data.resume();
          });
        }
      } catch (writeError) {
        console.error(`Write error for ${outputPath}:`, (writeError as Error).message);
        console.error((writeError as Error).stack);
        cleanup();
        reject(writeError);
      }
    });

    response.data.on('end', () => {
      try {
        writer.end();
        cleanup = () => {};
        resolve();
      } catch (endError) {
        console.error(`Stream end error for ${outputPath}:`, (endError as Error).message);
        console.error((endError as Error).stack);
        cleanup();
        reject(endError);
      }
    });

    response.data.on('error', (err) => {
      console.error(`Stream error for ${url}:`, err.message);
      console.error(err.stack);
      cleanup();
      reject(err);
    });

    writer.on('error', (err) => {
      console.error(`Writer error for ${outputPath}:`, err.message);
      console.error(err.stack);
      cleanup();
      reject(err);
    });

    writer.on('close', () => {
      cleanup = () => {};
    });
  });
}
