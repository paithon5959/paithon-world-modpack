# Paithon World Installer


A modpack installer for Minecraft that downloads modpack configuration from GitHub and mods from Modrinth.

## Features

- Downloads modpack repository from GitHub
- Downloads mods from Modrinth with SHA1 verification
- Concurrent downloads with progress tracking
- Automatic hash verification

## Installation

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- Node.js (optional, can use Bun instead)

## Compilation

### Compile the project

```bash
bun compile src/index.ts --outfile dist/index.js
```

This compiles TypeScript to JavaScript in a single execution.

### Create standalone executable

Bun can generate standalone executables from TypeScript or JavaScript files:

```bash
bun build src/index.ts --compile --outfile paithon-world-installer
```

This creates a self-contained executable that includes the Bun runtime and all dependencies.

### Cross-compile for other platforms

```bash
# Linux x64 (standard Linux desktop)
bun build src/index.ts --compile --target bun-linux-x64 --outfile paithon-world-installer-linux

# Windows x64 (standard Windows)
bun build src/index.ts --compile --target bun-windows-x64 --outfile paithon-world-installer.exe

# macOS ARM64 (Apple Silicon Macs)
bun build src/index.ts --compile --target bun-darwin-arm64 --outfile paithon-world-installer-mac

# macOS x64 (Intel Macs)
bun build src/index.ts --compile --target bun-darwin-x64 --outfile paithon-world-installer-mac-intel

# Linux ARM64 
bun build src/index.ts --compile --target bun-linux-arm64 --outfile paithon-world-installer-linux-arm
```

Supported targets: `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`, `bun-darwin-x64`, `bun-darwin-arm64`, and more.

### Run the project

Development mode:
```bash
bun run src/index.ts
```

Production mode (after compilation):
```bash
bun run dist/index.js
```

Standalone executable:
```bash
./paithon-world-installer
```

## Development

### Clone the repository

```bash
git clone https://github.com/paithon/paithon-world-installer.git
cd paithon-world-installer
```

### Install dependencies

```bash
bun install
```

### Project Structure

```
paithon-world-installer/
├── src/
│   ├── index.ts          # Main application entry point
│   └── utils/
│       ├── hash.ts       # SHA1 hash calculation
│       ├── download.ts   # File download with progress
│       ├── modrinth.ts   # Modrinth API integration
│       └── file.ts       # File loading and parsing
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Usage

### Basic usage

```bash
bun run src/index.ts
```

This will:
- Download from the default GitHub repository: `paithon/paithon-world-modpack`
- Extract files to the default directory: `./paithon-world`
- Download mods to `./paithon-world/mods`

### Custom repository and directory

```bash
bun run src/index.ts <github-repo> <output-directory>
```

Example:
```bash
bun run src/index.ts username/repo-name ./my-modpack
```

### Command line arguments

- `github-repo` (optional): GitHub repository in format `username/repo-name`. Default: `paithon/paithon-world-modpack`
- `output-directory` (optional): Directory where modpack will be installed. Default: `./paithon-world`

## How it works

1. Downloads modpack repository from GitHub as zip
2. Extracts and organizes files to output directory
3. Downloads mods from Modrinth using hashes from `mods_hash.txt`
4. Verifies SHA1 hashes of all downloaded files

## License

This project is licensed under the MIT License - see the LICENSE file for details.
