import { PexelsSize, PexelsOrientation } from "@/utils/enum";

interface PexelsVideoParams {
  query: string;
  orientation?: PexelsOrientation;
  size?: PexelsSize;
  locale?: string;
  page?: number;
  per_page?: number;
}

interface PexelsPagination {
  page: number;
  per_page: number;
  total_results: number;
  prev_page?: string;
  next_page?: string;
}

export interface IPexelsVideo {
  id: number;
  url: string;
  image: string;
  duration: number;
  width: number;
  height: number;
  user: string;
}

export interface IPexelsVideoFile {
  id: number;
  quality: string; // "sd" | "hd" | "uhd";
  file_type: string; // "video/mp4";
  width: number;
  height: number;
  fps: number;
  link: string;
  size: number;
}

interface IPexelsVideoPicture {
  id: number;
  nr: number;
  picture: string;
}

interface IPexelsUser {
  id: number;
  name: string;
  url: string;
}

interface IPexelsVideoDetail {
  id: number;
  width: number;
  height: number;
  duration: number;
  full_res: string | null;
  tags: string[];
  url: string;
  image: string;
  avg_color: string | null;
  user: IPexelsUser;
  video_files: IPexelsVideoFile[];
  video_pictures: IPexelsVideoPicture[];
}

export class StockVideoService {
  private apiKey: string;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async searchVideos(
    params: PexelsVideoParams,
  ): Promise<{ videos: IPexelsVideo[]; pagination: PexelsPagination }> {
    try {
      const { query, orientation, size, locale, page = 1, per_page = 10 } = params;

      if (!query) throw new Error("The field 'query' is required.");

      const url = new URL(`${this.baseUrl}/videos/search`);
      url.searchParams.append("query", query);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("per_page", per_page.toString());
      if (orientation) url.searchParams.append("orientation", orientation);
      if (size) url.searchParams.append("size", size);
      if (locale) url.searchParams.append("locale", locale);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const reason = data?.error || "Unknown error";
        throw new Error(`Pexels API error (${response.status}): ${reason}`);
      }

      const videos = data.videos.map((v: any) => ({
        id: v.id,
        url: v.url,
        image: v.image,
        duration: v.duration,
        width: v.width,
        height: v.height,
        user: v.user?.name || "Unknown",
      }));

      const pagination: PexelsPagination = {
        page: data.page,
        per_page: data.per_page,
        total_results: data.total_results,
        prev_page: data.prev_page,
        next_page: data.next_page,
      };

      return { videos, pagination };
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.message || "Failed to search videos on Pexels.");
    }
  }

  async getVideoDownloadUrl(id: number): Promise<IPexelsVideoDetail> {
    try {
      if (!id) {
        throw new Error("The field 'id' is required.");
      }

      const url = `${this.baseUrl}/videos/videos/${id}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: this.apiKey,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Pexels API error: ", data);
        throw new Error(`Pexels API error (${response.status})`);
      }

      return data;
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.message || "Failed to search videos on Pexels.");
    }
  }
}
