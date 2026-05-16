# Phonos Speech Enhancer

A modern Node.js/TypeScript client for Adobe's Phonos speech enhancement service (as used in Adobe Podcast).

## Features

- **TypeScript First**: Full type definitions for all API responses.
- **Developer Friendly**: Modular architecture with extracted constants and types.
- **Robust Polling**: Built-in retry and polling logic for enhancement tracks.
- **CLI Ready**: Easy-to-use command line interface for quick audio processing.

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd speech-enhancer
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Command Line (Quick Start)

The easiest way to process a file is using the `dev` script or by running the compiled index directly.

**Using `tsx` (Development):**

```bash
# Pass your Adobe Authorization Token
# Default file is ./output.mp3 if not specified
npm run dev -- ./path/to/your/audio.mp3
```

**Using compiled code:**

```bash
npm run build
npm start -- ./path/to/your/audio.mp3
```

### API Usage

You can also use the `PhonosAPI` class directly in your own projects:

```typescript
import { PhonosAPI } from "./src/phonos-api.js";

const api = new PhonosAPI("your_bearer_token");

// 1. Upload
const signedId = await api.uploadFile("./test.mp3");

// 2. Enhance
await api.createEnhanceSpeechTrack("unique-track-uuid");

// 3. Poll and Download
const { status, data } = await api.checkEnhancementResult("unique-track-uuid");
if (status === 200 && data.url) {
  await api.downloadEnhancedAudio(data.url, "enhanced.wav");
}
```

## Configuration

The project uses the following constants in `src/constants.ts`:

- `MAX_POLLING_ATTEMPTS`: Default is 60.
- `POLLING_INTERVAL_MS`: Default is 5000ms (5 seconds).

## Development

- **Build**: `npm run build` (outputs to `dist/`)
- **Dev Mode**: `npm run dev` (uses `tsx` to run without manual compilation)
- **Lint/Check**: `npx tsc --noEmit`

## License

ISC
