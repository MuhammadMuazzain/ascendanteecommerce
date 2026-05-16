interface PixabayVideoParams {
  query: string;
  lang?: string;
  id?: string;
  video_type?: "all" | "film" | "animation";
  category?: string;
  min_width?: number;
  min_height?: number;
  editors_choice?: boolean;
  safesearch?: boolean;
  order?: "popular" | "latest";
  page?: number;
  per_page?: number;
}

interface PixabayVideoRendition {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail: string;
}

export interface IPixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  videos: Record<string, PixabayVideoRendition>;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

export interface PixabayPagination {
  total: number;
  totalHits: number;
}

export class StockImageService {
  private apiKey: string;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async searchVideos(
    params: PixabayVideoParams,
  ): Promise<{ videos: IPixabayVideo[]; pagination: PixabayPagination }> {
    try {
      const {
        query,
        lang = "en",
        id,
        video_type = "all",
        category,
        min_width = 0,
        min_height = 0,
        editors_choice = false,
        safesearch = false,
        order = "popular",
        page = 1,
        per_page = 20,
      } = params;

      //if (!query && !id) throw new Error("The field 'q' or 'id' is required.");

      const url = new URL(`${this.baseUrl}/videos`);
      url.searchParams.append("key", this.apiKey);
      if (query) url.searchParams.append("q", query);
      if (id) url.searchParams.append("id", id);
      if (lang) url.searchParams.append("lang", lang);
      url.searchParams.append("video_type", video_type);
      if (category) url.searchParams.append("category", category);
      if (min_width) url.searchParams.append("min_width", min_width.toString());
      if (min_height) url.searchParams.append("min_height", min_height.toString());
      if (editors_choice)
        url.searchParams.append("editors_choice", editors_choice ? "true" : "false");
      if (safesearch) url.searchParams.append("safesearch", safesearch ? "true" : "false");
      url.searchParams.append("order", order);
      url.searchParams.append("page", page.toString());
      url.searchParams.append("per_page", per_page.toString());

      const response = await fetch(url.toString());
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const reason = data?.error || "Unknown error";
        throw new Error(`Pixabay API error (${response.status}): ${reason}`);
      }

      const videos = data.hits.map((v: any) => ({
        id: v.id,
        pageURL: v.pageURL,
        type: v.type,
        tags: v.tags,
        duration: v.duration,
        videos: v.videos,
        views: v.views,
        downloads: v.downloads,
        likes: v.likes,
        comments: v.comments,
        user_id: v.user_id,
        user: v.user,
        userImageURL: v.userImageURL,
      }));

      const pagination: PixabayPagination = {
        total: data.total,
        totalHits: data.totalHits,
      };

      return { videos, pagination };
    } catch (err: any) {
      console.error(err);
      throw new Error(err?.message || "Failed to search videos on Pexels.");
    }
  }
}
