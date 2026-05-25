import ProgressBar from 'progress';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as unzipper from 'unzipper';
import { calculateSHA1 } from './utils/hash.js';
import { downloadFile } from './utils/download.js';
import { loadHashFile, FileEntry } from './utils/file.js';
import { getDownloadUrlFromHash } from './utils/modrinth.js';

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('\n✗ UNCAUGHT EXCEPTION:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n✗ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

async function main() {
  const githubRepo = process.argv[2] || 'paithon5959/paithon-world-modpack';
  const outputDir = process.argv[3] || './paithon-world';
  const concurrency = 4; // Number of concurrent downloads

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const modsDir = path.join(outputDir, 'mods');
  if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
  }

  console.log(`Downloading modpack resources from ${githubRepo}...`);

  // Download entire repository as zip
  const zipUrl = `https://github.com/${githubRepo}/archive/refs/heads/main.zip`;
  const zipPath = path.join(outputDir, 'repo.zip');
  const extractedDir = path.join(outputDir, `${githubRepo.split('/')[1]}-main`);

  // Clean up any existing extracted folder from previous runs
  if (fs.existsSync(extractedDir)) {
    fs.rmSync(extractedDir, { recursive: true, force: true });
  }

  // Clean up any existing zip file from previous runs
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  try {
    await downloadFile(zipUrl, zipPath, () => {});
    console.log(`✓ Downloaded repository`);

    // Extract zip file using unzipper
    const directory = await unzipper.Open.file(zipPath);
    const extractedDir = path.join(outputDir, `${githubRepo.split('/')[1]}-main`);

    await directory.extract({ path: outputDir });

    // Move contents from extracted folder to output directory
    if (fs.existsSync(extractedDir)) {
      const files = fs.readdirSync(extractedDir);
      for (const file of files) {
        const srcPath = path.join(extractedDir, file);
        const destPath = path.join(outputDir, file);

        // Handle directory vs file
        if (fs.statSync(srcPath).isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          // Recursively move directory contents
          const subFiles = fs.readdirSync(srcPath);
          for (const subFile of subFiles) {
            const srcSubPath = path.join(srcPath, subFile);
            const destSubPath = path.join(destPath, subFile);
            // Remove destination if it already exists
            if (fs.existsSync(destSubPath)) {
              fs.rmSync(destSubPath, { recursive: true, force: true });
            }
            fs.renameSync(srcSubPath, destSubPath);
          }
          fs.rmdirSync(srcPath);
        } else {
          // Remove destination if it already exists
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath);
          }
          fs.renameSync(srcPath, destPath);
        }
      }
      fs.rmdirSync(extractedDir);
    }

    // Clean up zip file
    fs.unlinkSync(zipPath);
    console.log(`✓ Extracted repository`);
  } catch (error) {
    console.log(`Warning: Could not download repository: ${(error as Error).message}`);
    // Clean up partial downloads
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    if (fs.existsSync(extractedDir)) {
      fs.rmSync(extractedDir, { recursive: true, force: true });
    }
  }

  // Load hash file if it exists
  const hashFilePath = path.join(outputDir, 'mods_hash.txt');
  if (!fs.existsSync(hashFilePath)) {
    console.log('\nNo mods_hash.txt found, skipping mod downloads');
    return;
  }

  console.log(`Loading hash file: ${hashFilePath}`);
  const hashFile = await loadHashFile(hashFilePath);

  console.log(`Found ${hashFile.files.length} files to download`);

  // Filter files that need to be downloaded
  const filesToDownload: Array<{ file: FileEntry; url: string }> = [];
  for (const file of hashFile.files) {
    const outputPath = path.join(modsDir, file.name);

    // Check if file already exists and has correct hash to save time
    if (fs.existsSync(outputPath)) {
      const actualHash = await calculateSHA1(outputPath);
      if (actualHash.toLowerCase() === file.hash.toLowerCase()) {
        console.log(`✓ ${file.name} already exists with correct hash`);
        continue;
      }
    }

    try {
      const downloadUrl = await getDownloadUrlFromHash(file.hash);
      filesToDownload.push({ file, url: downloadUrl });
    } catch (error) {
      console.log(`✗ Failed to get download URL for ${file.name}: ${(error as Error).message}`);
    }
  }

  if (filesToDownload.length === 0) {
    console.log('\nAll files already exist with correct hashes');
    return;
  }

  console.log(`\nDownloading ${filesToDownload.length} files concurrently...`);

  // Get total size for progress bar
  let totalSize = 0;
  for (const { url } of filesToDownload) {
    try {
      const response = await axios.head(url);
      const size = parseInt(<string>response.headers['content-length'] || '0');
      totalSize += size;
    } catch (error) {
      console.log(`Warning: Could not get size for ${url}`);
    }
  }


  // Convert to MB
  const totalSizeMB = totalSize / 1024 / 1024;

  const bar = new ProgressBar('Downloading [:bar] :percent :etas :speed :downloaded/:total MB', {
    complete: '=',
    incomplete: ' ',
    width: 40,
    total: parseFloat(totalSizeMB.toFixed(2))
  });

  let downloadedMB = 0;
  const startTime = Date.now();
  let completedCount = 0;

  const downloadWithProgress = async (item: { file: FileEntry; url: string }) => {
    const { file, url } = item;
    const outputPath = path.join(modsDir, file.name);

    try {
      await downloadFile(url, outputPath, (bytes) => {
        const mb = bytes / 1024 / 1024;
        downloadedMB += mb;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? downloadedMB / elapsed : 0; // MB/s
        bar.tick(mb, {
          speed: speed.toFixed(2) + ' MB/s',
          downloaded: downloadedMB.toFixed(2),
          total: totalSizeMB.toFixed(2)
        });
      });

      process.stdout.clearLine(0);
      console.log(`\n✓ ${file.name} downloaded`);
      completedCount++;
      console.log(`Progress: ${completedCount}/${filesToDownload.length} files completed`);
    } catch (error) {
      console.log(`\n✗ Failed to download ${file.name}: ${(error as Error).message}`);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    }
  };

  // Download files concurrently with limited concurrency
  const chunks: Array<{ file: FileEntry; url: string }>[] = [];
  for (let i = 0; i < filesToDownload.length; i += concurrency) {
    chunks.push(filesToDownload.slice(i, i + concurrency));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(downloadWithProgress));
  }

  // Check all mods hash at the last step
  console.log('\nVerifying all downloaded files...');
  let verificationErrors = 0;
  for (const file of hashFile.files) {
    // Skip mods_hash.txt from verification
    if (file.name === 'mods_hash.txt') continue;

    const outputPath = path.join(modsDir, file.name);
    try {
      const actualHash = await calculateSHA1(outputPath);
      if (actualHash.toLowerCase() !== file.hash.toLowerCase()) {
        console.log(`✗ Hash mismatch for ${file.name}`);
        verificationErrors++;
      }
    } catch (error) {
      console.log(`✗ Failed to verify ${file.name}: ${(error as Error).message}`);
      verificationErrors++;
    }
  }

  if (verificationErrors > 0) {
    console.log(`\n✗ Verification failed for ${verificationErrors} files`);
  } else {
    console.log('\n✓ All downloads completed and verified successfully!');
  }
}

main().catch(console.error);
