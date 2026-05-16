export const PHONOS_BASE_URL = "https://phonos-server-flex.adobe.io";

export const DEFAULT_HEADERS = {
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  origin: "https://podcast.adobe.com",
  priority: "u=1, i",
  referer: "https://podcast.adobe.com/",
  "sec-ch-ua": '"Chromium";v="137", "Not/A)Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "x-api-key": "phonos-server-prod",
  "x-cookie-settings": "C0001,C0002,C0003,C0004",
};

export const POLLING_INTERVAL_MS = 5000;
export const MAX_POLLING_ATTEMPTS = 60;
