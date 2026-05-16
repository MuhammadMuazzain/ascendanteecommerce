import { chatFlow } from "@/genkit/chatFlow";
import { appRoute } from "@genkit-ai/next";

export const POST = appRoute(chatFlow);
