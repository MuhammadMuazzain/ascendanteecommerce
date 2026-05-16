import { narrativeVideoOrchestrator } from "./narrative";
import { productVideoOrchestrator } from "./product-video-ads";
import { productImageOrchestrator } from "./product-image-ads";
import { schemaLipsync } from "./lipsync-resolver";
import { ugcVideoOrchestrator } from "./ugc";
import { fakeUgcVideoOrchestrator } from "./fake-ugc/orchestrator";
import { characterDrivenAdOrchestrator } from "./character-driven-ad/orchestrator";
import { generateCharacterAdScript } from "./character-driven-ad/script-generator";
import { generateNarrativeScript } from "./narrative/script-generator";
import { generateProductAdScript } from "./product-video-ads/script-generator";
import { generateProductImageAdScript } from "./product-image-ads/script-generator";
import { generateUGCScript } from "./ugc/script-generator";
import { generateFakeUGCScript } from "./fake-ugc/script-generator";
import { kalodataVideosOrchestrator } from "./kalodata-videos/orchestrator";
import { repurposeVideoOrchestrator } from "./repurpose/repurpose-orchestrator";
import { generateStandardImage, generateStandardVideo } from "./common/shot-generator";
import { generateUGCImage, generateUGCVideo } from "./ugc/shot-generator";

export const functions = [
  narrativeVideoOrchestrator,
  productVideoOrchestrator,
  productImageOrchestrator,
  schemaLipsync,
  ugcVideoOrchestrator,
  fakeUgcVideoOrchestrator,
  characterDrivenAdOrchestrator,
  generateCharacterAdScript,
  generateNarrativeScript,
  generateProductAdScript,
  generateProductImageAdScript,
  generateUGCScript,
  generateFakeUGCScript,
  kalodataVideosOrchestrator,
  repurposeVideoOrchestrator,
  generateStandardImage,
  generateStandardVideo,
  generateUGCImage,
  generateUGCVideo,
];
