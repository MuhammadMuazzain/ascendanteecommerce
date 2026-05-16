import dotenv from "dotenv";

dotenv.config();

export const config = {
  webshare: {
    url: process.env.WEBSHARE_BASE_URL as string,
    apiKey: process.env.WEBSHARE_API_KEY as string,
    accountListUrl: process.env.WEBSHARE_ACCOUNT_LIST_URL as string,
  },
  YtDlp: {
    proxyUrl: process.env.PROXY_URL as string,
    cookieUrl: process.env.COOKIE_URL as string,
    blockedProxyListUrl: process.env.BLOCKED_PROXY_LIST_URL as string,
  },
  r2: {
    bucket: process.env.R2_BUCKET_NAME as string,
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    accountId: process.env.R2_ACCOUNT_ID as string,
    cdn: process.env.R2_PUBLIC_DOMAIN as string,
  },
};
