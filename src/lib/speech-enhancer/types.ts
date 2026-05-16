export interface DirectUploadResponse {
  signed_id: string;
  direct_upload: {
    url: string;
    headers: Record<string, string>;
  };
}

export interface EnhancedAudioResponse {
  status: number;
  url?: string;
  [key: string]: any;
}

export interface EnhanceSpeechTrackParams {
  id: string;
  track_name: string;
  model_version: string;
  signed_id: string;
}

export interface PhonosAPIResponse<T = any> {
  status: number | null;
  data: T | null;
}
