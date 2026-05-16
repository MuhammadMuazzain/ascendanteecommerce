import { Inngest } from "inngest";

// Create a client to send and receive events with realtime support
export const inngest = new Inngest({
  id: "my-app",
  isDev: process.env.NODE_ENV === "development",
});
