// https://elevenlabs.io/docs/api-reference/voice-library/get-shared

export interface paramsVoice {
  search?: string;
  language?: string;
  category?: string;
  age?: string;
  accent?: string;
  locale?: string;
  gender?: string;

  page_size?: number;
  //page?: number;
  next_page_token?: string;
}

export interface VoiceResponse {
  id: string;
  name: string;
  accent: string;
  gender: string;
  age: string;
  descriptive: string;
  useCase: string;
  category: string;
  language: string;
  locale: string;
  description: string;
  previewUrl: string;
  [key: string]: any;
}
