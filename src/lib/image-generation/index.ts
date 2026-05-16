import { GeminiProvider } from "./nanobanana/gemini";
import { Seedream4Provider } from "./seedream/seedream4";
import { Seedream45Provider } from "./seedream/seedream45";
import { Generator, GeneratorConfig, GenerationResponse } from "./interface";

/**
 * Unified GeneratorManager that handles different models and their specific configurations.
 */
export class ImageGenerator implements Generator {
  public instance: Generator;

  constructor(config: GeneratorConfig) {
    this.instance = this.createInstance(config);
  }

  private createInstance(config: GeneratorConfig): Generator {
    switch (config.provider) {
      case "gemini":
        return new GeminiProvider(config.params);
      case "seedream4":
        return new Seedream4Provider(config.params);
      case "seedream45":
        return new Seedream45Provider(config.params);
      default:
        throw new Error(`Unknown provider type: ${(config as any).provider}`);
    }
  }

  async create(data: any): Promise<string> {
    return this.instance.create(data);
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    if (this.instance.getStatus) {
      return this.instance.getStatus(id);
    }
    return { id, status: "COMPLETED" };
  }
}
