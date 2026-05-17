import axios from 'axios';

interface ModrinthVersionFile {
  files: Array<{
    url: string;
    primary: boolean;
  }>;
}

export async function getDownloadUrlFromHash(hash: string): Promise<string> {
  const response = await axios.get(`https://api.modrinth.com/v2/version_file/${hash}`);
  const data: ModrinthVersionFile = response.data;

  // Find the primary file or use the first one
  const file = data.files.find(f => f.primary) || data.files[0];
  if (!file) {
    throw new Error('No files found in Modrinth response');
  }

  return file.url;
}
