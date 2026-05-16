import { serve } from "inngest/next";
import { getInngestApp } from "@/inngest";
import { functions } from "@/inngest/functions";

const inngest = getInngestApp();

/** Dev sync endpoint for Inngest CLI / Cloud. DB access is lazy-init to survive brief env reload gaps. */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
