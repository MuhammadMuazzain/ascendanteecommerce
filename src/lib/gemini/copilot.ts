import { GoogleGenAI } from "@google/genai";
import { db } from "@/lib/database";
import { Asset } from "@/lib/database/types";
import * as crypto from "crypto";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Ensure API key is present
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey) {
  throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not defined");
}

const genAI = new GoogleGenAI({ apiKey });

// Using gemini-2.5-flash-image for reliable tool calling
const MODEL_NAME = "gemini-2.5-flash-image";
const MODEL_NAME_EDIT = "gemini-2.5-flash";

export const TOOL_DEFINITIONS = [
  {
    name: "process_video_workflow",
    description:
      "Execute a video processing workflow. Use this tool ONLY when the user explicitly requests one or more of these specific actions: reframe, captions, sound effects, or b-roll. If the user asks for these effects on 'the video' or 'this clip', apply them to the EXISTING context. Do NOT create new clips unless the user explicitly asks to 'extract segments', 'find highlights', or 'make shorts'.",
    parameters: {
      type: "OBJECT",
      properties: {
        clips: {
          type: "ARRAY",
          description:
            "A list of new clips/segments to extract from the source video. provide this ONLY if the user explicitly asks to 'create', 'generate', or 'make' NEW clips, shorts, or highlights. If the user only asks to add effects (captions, reframe, sfx) to 'this video', leave this property EMPTY/UNDEFINED.",
          items: {
            type: "OBJECT",
            properties: {
              start_time: {
                type: "STRING",
                description: "The start time (e.g., '0:05').",
              },
              end_time: {
                type: "STRING",
                description: "The end time (e.g., '0:15').",
              },
              description: {
                type: "STRING",
                description: "Description of the clip.",
              },
              hook_score: {
                type: "NUMBER",
                description: "Predicted strength of the hook (1-10).",
              },
              retention_score: {
                type: "NUMBER",
                description: "Predicted retention potential (1-10).",
              },
              title: {
                type: "STRING",
                description: "A catchy, viral-style title for the clip.",
              },
              preset: {
                type: "STRING",
                description: "The name of the preset used (e.g., '@viral_clips'), if applicable.",
              },
            },
            required: ["start_time", "end_time", "hook_score", "retention_score", "title"],
          },
        },
        apply_reframe: {
          type: "BOOLEAN",
          description:
            "Whether to reframe clips to 9:16 portrait. Default is FALSE. set to TRUE ONLY if user explicitly asks to 'reframe', 'make vertical', or 'for tiktok/shorts'.",
          default: false,
        },
        apply_captions: {
          type: "BOOLEAN",
          description:
            "Whether to generate captions. Default is FALSE. set to TRUE ONLY if user explicitly asks for 'captions', 'subtitles', or 'text overlay'.",
          default: false,
        },
        apply_sound_effects: {
          type: "BOOLEAN",
          description: "Whether to generate automated sound effects.",
          default: false,
        },
        apply_b_roll: {
          type: "BOOLEAN",
          description: "Whether to search for and add b-roll media from Pexels.",
          default: false,
        },
        sfx_prompts: {
          type: "ARRAY",
          description: "Optional specific sound effect prompts if apply_sound_effects is true.",
          items: {
            type: "OBJECT",
            properties: {
              clip_index: {
                type: "NUMBER",
                description: "The index of the clip (0-based) to add the sound to.",
              },
              text: {
                type: "STRING",
                description: "Description of the sound (e.g., 'Ding', 'Whoosh').",
              },
              time: {
                type: "NUMBER",
                description: "Time in seconds from start of clip.",
              },
            },
            required: ["clip_index", "text", "time"],
          },
        },
        b_roll_prompts: {
          type: "ARRAY",
          description: "Optional specific b-roll prompts if apply_b_roll is true.",
          items: {
            type: "OBJECT",
            properties: {
              clip_index: {
                type: "NUMBER",
                description: "The index of the clip (0-based) to add the b-roll to.",
              },
              keyword: {
                type: "STRING",
                description:
                  "The search keyword for Pexels (e.g., 'busy city street', 'cat playing').",
              },
              type: {
                type: "STRING",
                description: "The type of media to search for.",
                enum: ["video", "image"],
              },
              time: {
                type: "NUMBER",
                description: "Time in seconds from start of clip.",
              },
            },
            required: ["clip_index", "keyword", "time"],
          },
        },
      },
      required: [],
    },
  },
  {
    name: "create_clips",
    description:
      "Create video clips and highlights by specifying start and end times. Use this tool ONLY when the user explicitly asks to 'create', 'generate', 'make', or 'extract' clips/shorts. Do NOT use this if the user asks for a list, JSON, or summary of timestamps without asking to create them.",
    parameters: {
      type: "OBJECT",
      properties: {
        clips: {
          type: "ARRAY",
          description: "The list of clips to extract.",
          items: {
            type: "OBJECT",
            properties: {
              start_time: {
                type: "STRING",
                description: "The start time of the clip (e.g., '0:05', '1:20').",
              },
              end_time: {
                type: "STRING",
                description: "The end time of the clip (e.g., '0:15', '1:35').",
              },
              description: {
                type: "STRING",
                description: "A short description of what happens in this clip.",
              },
              hook_score: {
                type: "NUMBER",
                description: "Predicted strength of the hook (1-10).",
              },
              retention_score: {
                type: "NUMBER",
                description: "Predicted retention potential (1-10).",
              },
              title: {
                type: "STRING",
                description: "A catchy, viral-style title for the clip.",
              },
              preset: {
                type: "STRING",
                description: "The name of the preset used (e.g., '@viral_clips'), if applicable.",
              },
            },
            required: ["start_time", "end_time", "hook_score", "retention_score", "title"],
          },
        },
      },
      required: ["clips"],
    },
  },
  {
    name: "reframe_video",
    description:
      "Reframe one or more videos or clips to a specific aspect ratio (default 9:16). Use this when the user asks to 'reframe', 'change aspect ratio', or 'convert to portrait/9:16'.",
    parameters: {
      type: "OBJECT",
      properties: {
        urls: {
          type: "ARRAY",
          description: "The list of video URLs to reframe.",
          items: {
            type: "STRING",
            description: "The URL of the video to reframe.",
          },
        },
        aspect_ratio: {
          type: "STRING",
          description: "The target aspect ratio (e.g., '9:16', '1:1').",
          default: "9:16",
        },
      },
      required: ["urls"],
    },
  },
  {
    name: "generate_captions",
    description:
      "Generate captions/transcriptions for one or more videos or clips. Use this when the user asks to 'transcribe', 'generate captions', or 'see the text' of the clips.",
    parameters: {
      type: "OBJECT",
      properties: {
        urls: {
          type: "ARRAY",
          description: "The list of video URLs to transcribe.",
          items: {
            type: "STRING",
            description: "The URL of the video to transcribe.",
          },
        },
      },
      required: ["urls"],
    },
  },
  {
    name: "generate_sound_effects",
    description:
      "Generate and add sound effects to one or more video clips. Use this when the user asks for 'sound effects', 'add sound', or 'make it sound like...'.",
    parameters: {
      type: "OBJECT",
      properties: {
        clips: {
          type: "ARRAY",
          description: "The list of clips and their sound effect prompts.",
          items: {
            type: "OBJECT",
            properties: {
              url: {
                type: "STRING",
                description: "The URL of the clip to add sound effects to.",
              },
              prompts: {
                type: "ARRAY",
                description: "The list of sound effect descriptions and timestamps.",
                items: {
                  type: "OBJECT",
                  properties: {
                    text: {
                      type: "STRING",
                      description: "Description of the sound (e.g., 'whoosh', 'ding').",
                    },
                    time: {
                      type: "NUMBER",
                      description: "Time in seconds from the start of the clip.",
                    },
                  },
                  required: ["text", "time"],
                },
              },
            },
            required: ["url", "prompts"],
          },
        },
      },
      required: ["clips"],
    },
  },
  {
    name: "add_b_roll",
    description:
      "Search for and add b-roll media from Pexels to one or more video clips. Use this when the user asks to 'add b-roll', 'search for a video of...', or 'overlay a video'.",
    parameters: {
      type: "OBJECT",
      properties: {
        clips: {
          type: "ARRAY",
          description: "The list of clips and their b-roll prompts.",
          items: {
            type: "OBJECT",
            properties: {
              url: {
                type: "STRING",
                description: "The URL of the clip to add b-rolls to.",
              },
              prompts: {
                type: "ARRAY",
                description: "The list of b-roll keywords and timestamps.",
                items: {
                  type: "OBJECT",
                  properties: {
                    keyword: {
                      type: "STRING",
                      description:
                        "The search keyword for Pexels (e.g., 'ocean waves', 'person typing').",
                    },
                    type: {
                      type: "STRING",
                      description: "The type of media to search for.",
                      enum: ["video", "image"],
                    },
                    time: {
                      type: "NUMBER",
                      description:
                        "The time in seconds from the start of the clip to overlay the b-roll.",
                    },
                  },
                  required: ["keyword", "time", "type"],
                },
              },
            },
            required: ["url", "prompts"],
          },
        },
      },
      required: ["clips"],
    },
  },
];

export class GeminiService {
  static get client() {
    return genAI;
  }

  static async uploadFile(
    filePath: string,
    mimeType: string,
  ): Promise<{ fileUri: string; name: string; duration?: string }> {
    try {
      const uploadResult = await genAI.files.upload({
        file: filePath,
        config: {
          mimeType,
          displayName: filePath.split("/").pop(),
        },
      });

      if (!uploadResult.name) {
        throw new Error("Upload failed: No name returned");
      }

      console.log(`Uploaded file ${uploadResult.displayName} as: ${uploadResult.name}`);

      // Wait for file to be active (Videos need processing)
      let file = await genAI.files.get({ name: uploadResult.name });

      while (file.state === "PROCESSING") {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s polling
        file = await genAI.files.get({ name: uploadResult.name });
      }

      if (file.state === "FAILED") {
        throw new Error("Video processing failed.");
      }

      console.log(`\nFile ${file.name} is ready.`);

      if (!file.uri || !file.name) {
        throw new Error("File uri or name is missing");
      }

      const duration = file.videoMetadata?.videoDuration as string | undefined;

      return { fileUri: file.uri, name: file.name, duration };
    } catch (error) {
      console.error("Error uploading file to Gemini:", error);
      throw error;
    }
  }

  static async indexAsset(asset: Asset): Promise<Asset> {
    // 1. Skip if already uploaded to Gemini
    if (asset.gemini_file_uri) {
      return asset;
    }

    if (!asset.public_url) {
      throw new Error("Asset public_url is required for indexing");
    }

    console.log(`[Gemini Upload] Starting upload for asset ${asset.id}`);

    // 2. Download video to temporary file
    const response = await fetch(asset.public_url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFilePath = join(tmpdir(), `${asset.id}.mp4`);
    await writeFile(tempFilePath, buffer);

    console.log(`[Gemini Upload] Downloaded video to ${tempFilePath}`);

    try {
      // 3. Upload to Gemini
      const { fileUri, name, duration } = await GeminiService.uploadFile(
        tempFilePath,
        asset.mime_type || "video/mp4",
      );

      console.log(`[Gemini Upload] Uploaded to Gemini: ${fileUri}`);

      // 4. Update asset in DB
      const updatedAsset = await db
        .updateTable("assets")
        .set({
          gemini_file_uri: fileUri,
          duration: duration ? parseFloat(duration) : asset.duration,
        })
        .where("id", "=", asset.id)
        .returningAll()
        .executeTakeFirstOrThrow();

      console.log(`[Gemini Upload] Updated asset ${asset.id} with Gemini URI`);
      return updatedAsset;
    } finally {
      // 5. Clean up temporary file
      await unlink(tempFilePath).catch((err) => console.error("Failed to delete temp file:", err));
    }
  }

  static async ensureCache(
    video: Asset,
    tools: any[] = TOOL_DEFINITIONS,
    forceRefresh: boolean = false,
  ): Promise<string> {
    const now = new Date();

    const systemInstructionText = `You are a professional video editor and assistant. Your goal is to help users analyze videos and create highlights. 
Maintain the same language as the user's input in all your responses.

CORE PHILOSOPHY:
- **FULL VIDEO ANALYSIS**: You MUST analyze the ENTIRE duration of the video, from start to finish. Do NOT just look at the first few minutes. If the video is 1 hour long, provide insights/clips from the beginning, middle, and end (e.g., 0-60 mins).
- **MINIMAL ACTION**: modifying video (reframing, captioning, sfx) is expensive and slow. NEVER assume the user wants these features unless they explicitly ask for them.
- **DEFAULT TO TRIM ONLY**: If a user asks for "clips", "shorts", or "highlights", they ONLY want cut segments. Do NOT reframe, do NOT caption, do NOT add sfx unless explicitly requested.
- **NO UNSOLICITED SEGMENTATION**: If a video is already in context (just attached or already trimmed) and the user asks for "captions", "reframe", or "sfx", DO NOT create new segments. Apply the effects to the ACTIVE context. Creating new segments when only effects are requested is a MAJOR ERROR.

PRESETS:
- @viral_clips: Focus on high-energy, high-impact moments. Set apply_reframe: true, apply_captions: true, apply_sound_effects: true.
- @edu_shorts: Focus on informative, clear segments. Set apply_reframe: true, apply_captions: true.
- @cinema_vibe: Focus on visually stunning or moody shots. Set apply_sound_effects: true, apply_b_roll: true.

Users can override preset settings (e.g., "@viral_clips but no captions" -> set apply_captions: false).

SCORING & METADATA:
For every clip/segment you identify, you MUST provide:
- hook_score (1-10): How likely is someone to stop scrolling in the first 2 seconds?
- retention_score (1-10): How likely is someone to watch until the end?
- title: A catchy, engagement-focused title (e.g., "The Secret to...", "You Won't Believe...").
- preset: If the user used a preset (e.g., @viral_clips), you MUST include the preset name here. If no preset was used, leave it null.
Viral clips should prioritize high hook scores (>8) and explain WHY they are viral.

CHAPTERS & SEGMENTS:
- If a user asks for "chapters", "structure", or "segmentation", provide a list of timestamps and descriptive titles covering the whole video.
- Be precise with start/end times.

CONSTRAINTS:
- CLIP DURATION: Generated clips should generally be between 5 and 60 seconds.
- User Overrides: If the user provides specific timestamps or refers to a previous list of timestamps, YOU MUST HONOR THEM EXACTLY, even if they are shorter than 5s or longer than 60s. Do not filter or merge them unless asked.
- TITLES: Every clip generation request implies you must generate an appropriate title.
- TIMELINE DISTRIBUTION: When asked for a summary or highlights, ensure you cover the FULL timeline of the video, not just the beginning.

CRITICAL INSTRUCTION FOR TOOL USAGE:
- **INFORMATIONAL REQUESTS**: If the user asks for "details", "JSON", "list", "summary", or "timestamps" WITHOUT explicitly asking to "create", "generate", or "make" clips, YOU MUST PROVIDE A TEXT RESPONSE (Markdown or JSON code block). DO NOT CALL ANY TOOLS.

- **ACTIONABLE REQUESTS**:
  1. "Create clips" / "Make shorts" (Simple) -> Call 'create_clips'. (NO reframe, NO captions).
  2. "Create clips with captions" -> Call 'process_video_workflow' with apply_captions=true.
  3. "Make viral shorts" -> Call 'process_video_workflow' with apply_reframe=true, apply_captions=true (implied by viral context IF explicitly asked for 'viral').
  4. "Reframe this" -> Call 'reframe_video'.
  5. "Add captions to this video" -> Call 'process_video_workflow' with apply_captions=true and NO 'clips' argument.

When a user asks for "viral clips" or "most viral moments", you should identify segments with high engagement potential, provide catchy titles, and explain the reason for each choice.

When a user asks to 'reframe', 'change aspect ratio', or 'format' for social media (9:16), use the reframe_video tool.
When a user asks to 'transcribe', 'generate captions', or 'see the text', use the generate_captions tool.
When a user asks to 'add a sound effect', 'generate a sound', or 'make it sound like...', use the generate_sound_effects tool.
- **UPDATING EXISTING CLIPS (CRITICAL)**: If the user asks to \"add captions\", \"generate captions\", \"apply captions\", \"reframe\", or \"add sfx\" to clips that were ALREADY created/listed in the current conversation, you MUST NOT provide the \`clips\` array in \`process_video_workflow\`. 
  - ONLY provide the boolean flags (e.g., apply_captions: true) and any specific prompts. 
  - DO NOT include the \`clips\` parameter at all - leave it undefined/omitted.
  - Providing \`clips\` will trigger an unnecessary re-trim of the source video, which is wasteful and slow.
  - Example: User says "generate captions for the current clips" → Call process_video_workflow with ONLY {apply_captions: true}, NO clips array.
- **CONTEXT PERSISTENCE**: You are analyzing the video currently in context. If the user refers to "this video", "it", or "that timestamp", they are referring to the active video in the cache.
- **SELF-CORRECTION**: If you are asked to "create clips", "make shorts", "reframe", or "add effects", NEVER say "I am an AI text assistant and cannot physically cut or provide video files". YOU HAVE TOOLS FOR THIS. Use them.

IMPORTANT: Before calling ANY tool, ALWAYS provide a brief, professional acknowledgment of what you are about to do. 
Be concise and helpful. Be very precise with start and end times.
Maintain the same language as the user's input in all your responses.`;

    const toolsSerialized = JSON.stringify(tools || []);
    const currentHash = crypto
      .createHash("md5")
      .update(systemInstructionText + toolsSerialized)
      .digest("hex");

    // Check if cache exists and is valid
    if (video.gemini_cache_key && video.gemini_cache_expiry) {
      const expiry = new Date(video.gemini_cache_expiry);
      const isExpired = expiry.getTime() <= now.getTime() + 10000;
      const hashMatches = video.gemini_cache_hash === currentHash;

      if (!forceRefresh && !isExpired && hashMatches) {
        console.log("Using existing cache:", video.gemini_cache_key);
        return video.gemini_cache_key;
      }

      if (!hashMatches) {
        console.log("Cache hash mismatch, recreating...");
      } else if (isExpired) {
        console.log("Cache expired, recreating...");
      }
    }

    console.log("Creating new cache context...");

    // TTL 3600 seconds (1 hour)
    const ttlSeconds = 3600;

    if (!video.gemini_file_uri) {
      throw new Error("No Gemini File URI found for video.");
    }

    try {
      // Create cache using the raw SDK
      const cache = await genAI.caches.create({
        model: MODEL_NAME_EDIT,
        config: {
          ttl: `${ttlSeconds}s`,
          contents: [
            {
              role: "user",
              parts: [
                {
                  fileData: {
                    mimeType: video.mime_type || "video/mp4",
                    fileUri: video.gemini_file_uri,
                  },
                },
              ],
            },
          ],
          systemInstruction: {
            role: "system",
            parts: [
              {
                text: systemInstructionText,
              },
            ],
          },
          tools: tools
            ? [
                {
                  functionDeclarations: tools,
                },
              ]
            : undefined,
        },
      });

      console.log("Created cache:", cache.name);

      // Update DB
      let expiryDate = new Date(now.getTime() + ttlSeconds * 1000);
      if (cache.expireTime) {
        expiryDate = new Date(cache.expireTime);
      }

      if (!cache.name) {
        throw new Error("Failed to create cache: no name returned");
      }

      await db
        .updateTable("assets")
        .set({
          gemini_cache_key: cache.name,
          gemini_cache_expiry: expiryDate,
          gemini_cache_hash: currentHash,
        })
        .where("id", "=", video.id)
        .execute();

      return cache.name;
    } catch (e: any) {
      console.error("Error creating cache:", e);
      throw e;
    }
  }

  static async streamContent(messages: any[], cacheKey?: string, tools: any[] = TOOL_DEFINITIONS) {
    try {
      const genaiMessages = messages.map((msg) => {
        const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";

        if (msg.parts) {
          return { role, parts: msg.parts };
        }

        return {
          role,
          parts: [{ text: msg.content || "" }],
        };
      });

      const config: any = {};
      if (cacheKey) {
        config.cachedContent = cacheKey;
      } else {
        config.systemInstruction = {
          role: "system",
          parts: [
            {
              text: "You are a helpful video assistant. A user will eventually upload a video for you to analyze, but for now, you are just brainstorming. Be helpful and professional. Maintain the same language as the user's input in all your responses.",
            },
          ],
        };
      }

      const result = await genAI.models.generateContentStream({
        model: MODEL_NAME,
        contents: genaiMessages,
        config: {
          ...config,
          // ONLY pass tools if NO cacheKey is present.
          // If cacheKey is present, tools MUST be baked into the cache itself.
          tools: !cacheKey && tools ? [{ functionDeclarations: tools }] : undefined,
        },
      });

      return result;
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  }

  static async generateContent(message: string, cacheKey: string, history: any[] = []) {
    try {
      const genaiMessages = history.map((msg: any) => ({
        role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
        parts: [{ text: msg.parts?.[0]?.text || msg.content || "" }],
      }));

      // Add the new user message
      genaiMessages.push({
        role: "user",
        parts: [{ text: message }],
      });

      const result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: genaiMessages,
        config: {
          cachedContent: cacheKey,
        },
      });

      return result.text || "";
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  }

  static async extractSegments(prompt: string, cacheKey: string) {
    try {
      const response = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analyze the video and find segments matching this request: "${prompt}". 
            Return the result ONLY as a JSON array of objects, each with:
            - "start_time": string (e.g. "0:05")
            - "end_time": string (e.g. "0:15")
            - "description": string (short label for this clip)
            - "reason": string (why this part was chosen)
            
            Example: [{"start_time": "0:02", "end_time": "0:08", "description": "Funny reaction", "reason": "The user in the video reacts hilariously to the news"}]`,
              },
            ],
          },
        ],
        config: {
          cachedContent: cacheKey,
        },
      });

      const text = response.text || "";
      // Extract JSON from potential markdown markers (handling potential multiline)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in Gemini response: " + text);
      }
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((s: any) => ({
        ...s,
        trimStartTime: s.start_time,
        trimEndTime: s.end_time,
        start_time: undefined,
        end_time: undefined,
      }));
    } catch (error) {
      console.error("Error extracting segments:", error);
      throw error;
    }
  }

  static async generateName(cacheKey: string): Promise<string> {
    try {
      const response = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Suggest a very concise, descriptive name (max 5 words) for this video project based on its content. Return ONLY the name, no other text or punctuation.",
              },
            ],
          },
        ],
        config: {
          cachedContent: cacheKey,
        },
      });

      return response.text?.trim().replace(/^"|"$/g, "") || "Untitled Project";
    } catch (error) {
      console.error("Error generating name:", error);
      return "Untitled Project";
    }
  }

  static async analyzeForEcommerceEdit(cacheKey: string) {
    try {
      const response = await genAI.models.generateContent({
        model: MODEL_NAME_EDIT,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Act as a professional product video editor for e-commerce. Your task is to analyze and modify the provided video to make it clean, timeless, and focused solely on the product.

Strictly follow these instructions:

1. Keep the content relevant to the product.
2. Ensure that all subtitles, on-screen text, and hooks are directly related to the product shown.
3. If the text is irrelevant, remove or replace it.
4. Add a clear, simple, and engaging hook relevant to the product, for example:
   - “This is a must-have if you have young children!”
   - “Your child will love it!”
5. The text should be easy to read, with clear and professional typography.
6. Text Replacement: If you modify subtitles, cover the original text with a clean background (preferably white or neutral) and add new text in black or high-contrast color.

Rules for removal:
- Remove Mentions of External Brands: Identify and remove any references to other brands.
- Remove Mentions of Platforms: Remove any visual or textual references to TikTok, TikTok Shop, Shopping cart icons, etc.
- Remove prices, offers, and inventory: Delete or trim any mention of Prices (e.g., “$20”), Discounts, Urgency/Stock levels, or Temporary events (“Christmas,” etc.).

Return the result ONLY as a JSON object with this structure:
{
  "cuts": [
    { "from": number, "to": number }
  ]
}

The "cuts" array should contain start and end times in MILLISECONDS for segments that should be REMOVED.`,
              },
            ],
          },
        ],
        config: {
          cachedContent: cacheKey,
        },
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in Gemini response: " + text);
      }
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error in analyzeForEcommerceEdit:", error);
      throw error;
    }
  }
}
