# Voice Cloning API - Usage Examples

This document provides usage examples for the Voice Cloning API endpoints.

## API Endpoints

### 1. Clone a Voice

**POST** `/api/voice-cloning`

Clone a voice from audio samples.

```typescript
// Example: Clone a voice using FormData
const formData = new FormData();
formData.append("name", "My Custom Voice");
formData.append("description", "A professional voice for narration");

// Add audio files
const audioFile1 = new File([audioBlob1], "sample1.mp3", { type: "audio/mpeg" });
const audioFile2 = new File([audioBlob2], "sample2.mp3", { type: "audio/mpeg" });
formData.append("file0", audioFile1);
formData.append("file1", audioFile2);

// Optional: Add labels
const labels = {
  accent: "american",
  age: "middle-aged",
  gender: "male",
  use_case: "narration",
};
formData.append("labels", JSON.stringify(labels));

const response = await fetch("/api/voice-cloning", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log("Cloned voice:", data);
// Response:
// {
//   voice_id: "abc123...",
//   name: "My Custom Voice",
//   description: "A professional voice for narration",
//   preview_url: "https://...",
//   labels: { accent: "american", age: "middle-aged", ... },
//   category: "cloned"
// }
```

### 2. List All Cloned Voices

**GET** `/api/voice-cloning`

Get all user-created cloned voices.

```typescript
const response = await fetch("/api/voice-cloning");
const data = await response.json();
console.log("Cloned voices:", data.voices);
// Response:
// {
//   voices: [
//     {
//       voice_id: "abc123...",
//       name: "My Custom Voice",
//       description: "A professional voice for narration",
//       preview_url: "https://...",
//       category: "cloned",
//       labels: { ... }
//     },
//     ...
//   ]
// }
```

### 3. Get Voice Details

**GET** `/api/voice-cloning/[voiceId]`

Get detailed information about a specific cloned voice.

```typescript
const voiceId = "abc123...";
const response = await fetch(`/api/voice-cloning/${voiceId}`);
const data = await response.json();
console.log("Voice details:", data);
// Response:
// {
//   voice_id: "abc123...",
//   name: "My Custom Voice",
//   description: "A professional voice for narration",
//   preview_url: "https://...",
//   category: "cloned",
//   labels: { ... },
//   samples: [
//     {
//       sample_id: "sample1",
//       file_name: "sample1.mp3",
//       mime_type: "audio/mpeg",
//       size_bytes: 123456,
//       hash: "..."
//     },
//     ...
//   ],
//   settings: { ... }
// }
```

### 4. Delete a Cloned Voice

**DELETE** `/api/voice-cloning/[voiceId]`

Delete a cloned voice.

```typescript
const voiceId = "abc123...";
const response = await fetch(`/api/voice-cloning/${voiceId}`, {
  method: "DELETE",
});
const data = await response.json();
console.log("Delete result:", data);
// Response:
// {
//   success: true,
//   message: "Voice deleted successfully"
// }
```

### 5. Edit Voice Settings

**PATCH** `/api/voice-cloning/[voiceId]`

Update voice name, description, or labels.

```typescript
const voiceId = "abc123...";
const response = await fetch(`/api/voice-cloning/${voiceId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Updated Voice Name",
    description: "Updated description",
    labels: {
      accent: "british",
      age: "young",
      gender: "female",
      use_case: "conversational",
    },
  }),
});
const data = await response.json();
console.log("Updated voice:", data);
// Response:
// {
//   voice_id: "abc123...",
//   name: "Updated Voice Name",
//   description: "Updated description",
//   preview_url: "https://...",
//   labels: { accent: "british", age: "young", ... },
//   category: "cloned"
// }
```

## Complete Workflow Example

Here's a complete example of cloning a voice and using it with text-to-speech:

```typescript
// Step 1: Clone a voice
async function cloneVoice(audioFiles: File[], name: string) {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", "Custom cloned voice");

  audioFiles.forEach((file, index) => {
    formData.append(`file${index}`, file);
  });

  const response = await fetch("/api/voice-cloning", {
    method: "POST",
    body: formData,
  });

  return await response.json();
}

// Step 2: Use the cloned voice for text-to-speech
async function generateSpeech(voiceId: string, text: string) {
  const response = await fetch("/api/text-to-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text,
      voiceId: voiceId,
    }),
  });

  return await response.blob(); // Returns audio blob
}

// Usage
const audioFiles = [file1, file2, file3]; // Your audio files
const clonedVoice = await cloneVoice(audioFiles, "My Voice");
console.log("Voice cloned:", clonedVoice.voice_id);

const audioBlob = await generateSpeech(
  clonedVoice.voice_id,
  "Hello, this is my cloned voice speaking!",
);

// Play the audio
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();
```

## Best Practices

### Audio Sample Requirements

1. **Quality**: Use high-quality audio samples (clear, minimal background noise)
2. **Quantity**: 3-10 samples recommended for best results
3. **Duration**: Each sample should be 30 seconds to 2 minutes
4. **Format**: Supported formats include MP3, WAV, M4A, FLAC
5. **Content**: Samples should contain clear speech with varied intonation

### Error Handling

```typescript
try {
  const response = await fetch("/api/voice-cloning", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Error:", error.error);
    // Handle specific errors
    if (response.status === 400) {
      // Validation error
    } else if (response.status === 500) {
      // Server error
    }
  }

  const data = await response.json();
  // Success
} catch (error) {
  console.error("Network error:", error);
}
```

## Integration with Existing Voices API

The cloned voices will automatically appear in the `/api/voices` endpoint:

```typescript
// Get all voices (including cloned ones)
const response = await fetch("/api/voices");
const data = await response.json();

// Filter for cloned voices
const clonedVoices = data.voices.filter(
  (voice) => voice.category === "cloned" || voice.category === "generated",
);
```

## Environment Variables

Make sure the following environment variable is set:

```bash
ELEVENLABS_API_KEY=your_api_key_here
# or
ELEVENLABS_KEY=your_api_key_here
```
