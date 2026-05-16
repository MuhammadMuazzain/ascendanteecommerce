export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: {
    id: number;
    quality: "hd" | "sd";
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
  video_pictures: {
    id: number;
    picture: string;
    nr: number;
  }[];
}

export class StockVideoService {
  private static API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;

  static async searchVideos(query: string, perPage = 1): Promise<PexelsVideo[]> {
    if (!this.API_KEY) {
      console.warn("PEXELS_API_KEY is not defined. B-Roll search will fail.");
      return [];
    }

    try {
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`,
        {
          headers: {
            Authorization: this.API_KEY,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.videos || [];
    } catch (error) {
      console.error("Error searching Pexels videos:", error);
      return [];
    }
  }

  static async searchImages(query: string, perPage = 1): Promise<any[]> {
    if (!this.API_KEY) {
      console.warn("PEXELS_API_KEY is not defined. B-Roll search will fail.");
      return [];
    }

    try {
      const response = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`,
        {
          headers: {
            Authorization: this.API_KEY,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.photos || [];
    } catch (error) {
      console.error("Error searching Pexels images:", error);
      return [];
    }
  }

  static async getBestMediaUrl(
    query: string,
    type: "video" | "image" = "video",
  ): Promise<{
    url: string;
    duration: number;
    type: "video" | "image";
  } | null> {
    if (type === "video") {
      const videos = await this.searchVideos(query, 5);
      if (videos.length === 0) return null;

      const video = videos[0];
      const bestFile =
        video.video_files.find((f: any) => f.quality === "hd") || video.video_files[0];

      return {
        url: bestFile.link,
        duration: Math.min(video.duration, 2), // Cap at 2 seconds
        type: "video",
      };
    } else {
      const images = await this.searchImages(query, 5);
      if (images.length === 0) return null;

      const image = images[0];
      return {
        url: image.src.large2x || image.src.large || image.src.original,
        duration: 2, // Default 2 seconds for images
        type: "image",
      };
    }
  }
}
