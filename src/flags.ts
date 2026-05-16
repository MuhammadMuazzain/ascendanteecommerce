import { flag } from "flags/next";

export const showAiCopilot = flag({
  key: "ai-copilot",
  decide() {
    return process.env.FEATURE_AI_COPILOT === "true";
  },
});

export const showLinkToVideo = flag({
  key: "link-to-video",
  decide() {
    return process.env.FEATURE_LINK_TO_VIDEO === "true";
  },
});
