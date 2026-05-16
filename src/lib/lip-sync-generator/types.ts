export interface LatentSyncParams {
  videoUrl: string; // URL of the video to sync
  audioUrl: string; // URL of the audio to sync
  seed?: number; // Default 0
  guidanceScale?: number; // Default 1
  returnPrivateUrl?: boolean; // Default false
}

export interface LatentSyncStatusResponse {
  id: string;
  status: string; // 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  videos: string[]; // In the API it comes as 'generated'
}
