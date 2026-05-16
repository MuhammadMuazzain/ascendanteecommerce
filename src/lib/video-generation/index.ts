import { WanProvider } from "./wan";
import { PixVerseProvider } from "./pixverse";
import { HailuoProvider } from "./hailuo";
import { RunwayProvider } from "./runway";
import { VeoProvider } from "./veo";
import { FalVeoProvider } from "./fal-veo";
import { Generator, GeneratorConfig } from "./interface";
import { VideoParams, VideoStatusResponse } from "./types";

export class VideoGenerator implements Generator {
  public instance: Generator;

  constructor(config: GeneratorConfig) {
    this.instance = this.createInstance(config);
  }

  private createInstance(config: GeneratorConfig): Generator {
    switch (config.provider) {
      case "wan":
        return new WanProvider(config.params);
      case "pixverse":
        return new PixVerseProvider(config.params);
      case "hailuo":
        return new HailuoProvider(config.params);
      case "runway":
        return new RunwayProvider(config.params);
      case "veo":
        return new VeoProvider(config.params);
      case "fal-veo":
        return new FalVeoProvider(config.params);
      default:
        throw new Error(`Unknown provider type: ${(config as any).provider}`);
    }
  }

  async create(params: VideoParams): Promise<string | { url: string; duration: number }> {
    return this.instance.create(params);
  }

  async getStatus(id: string): Promise<VideoStatusResponse> {
    if (this.instance.getStatus) {
      return this.instance.getStatus(id);
    }
    return { id, status: "COMPLETED", videos: [] };
  }
}

export * from "./types";
export * from "./interface";
export * from "./wan";
export * from "./pixverse";
export * from "./hailuo";
export * from "./runway";
export * from "./veo";
