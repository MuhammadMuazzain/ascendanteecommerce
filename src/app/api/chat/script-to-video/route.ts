import { scriptToVideoFlow } from "@/genkit/scriptToVideoFlow";
import { appRoute } from "@genkit-ai/next";

export const POST = appRoute(scriptToVideoFlow);
