import dotenv from "dotenv";

dotenv.config();

export const config = {
  baseUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  //baseUrl: process.env.BASE_URL || "http://localhost:3000",
  tiktok: {
    url: process.env.TIKTOK_URI || "https://open.tiktokapis.com/v2",
    clientKey: process.env.TIKTOK_CLIENT_KEY as string,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET as string,
    redirectUrl: process.env.TIKTOK_REDIRECT_URI as string,
  },
  ig: {
    url: process.env.IG_URI || "https://graph.instagram.com/v23.0",
    appId: process.env.IG_APP_ID as string,
    appSecret: process.env.IG_APP_SECRET as string,
    redirectUri: process.env.IG_REDIRECT_URI as string,
  },
  google: {
    redirectUrl: process.env.GOOGLE_REDIRECT_URL as string,
    oauthAccount: process.env.GOOGLE_OUATH_ACCOUNT_B64 as string,
  },
};
