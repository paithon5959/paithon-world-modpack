import * as fs from 'fs';

export interface HashFile {
  files: Array<{
    name: string;
    hash: string;
  }>;
}

export interface FileEntry {
  name: string;
  hash: string;
}

export async function loadHashFile(filePath: string): Promise<HashFile> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim() && !line.startsWith('#'));

  const files: FileEntry[] = lines.map(line => {
    const parts = line.split('|');
    return {
      name: parts[0].trim(),
      hash: parts[1]?.trim() || ''
    };
  });

  return { files };
}
