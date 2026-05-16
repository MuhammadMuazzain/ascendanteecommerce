export enum FrameStyle {
  Realism = "realism",
  Anime = "anime",
  Claymation = "claymation",
  Pixar = "pixar",
  Cartoon = "cartoon",
  Mythological = "mythological",
  Digital = "digital",
  Ghibli = "ghibli",
  HyperRealistic = "hyper-realistic",
  Shadows = "shadows",
  ThreeD = "3d", // Changed from "3D" to a valid enum key
  Illustration = "illustration",
  Sketch = "sketch",
  Lego = "lego",
  Manga = "manga",
  Minecraft = "minecraft",
  WoodenTextured = "wooden-textured",
  TransparentGlass = "transparent-glass",
  PaperStyle = "paper-style",
  Cinematic = "cinematic",
  Miniature = "miniature",
  FeltWool = "felt-wool",
  Dreamwave = "dreamwave",
  Gigerwave = "gigerwave",
  GtaVi = "gta-vi", // Changed from "GTA VI" to a valid enum key
  PharmaCGI = "pharma-cgi",
}

export enum resolutionType {
  Low = "720p",
  High = "1080p",
}

export enum VideoType {
  AI_IMAGES = "AI_IMAGES",
  AI_VIDEOS = "AI_VIDEOS",
  STOCK_VIDEOS = "STOCK_VIDEOS",
  STOCK_IMAGES = "STOCK_IMAGES",
}

export enum ContinuityType {
  Continue = "continue",
  NewScene = "new_scene",
}

export enum aspectRatioType {
  ONE = "1:1",
  //THREE_FOUR = "3:4",
  //FOUR_THREE = "4:3",
  NINE_SIXTEEN = "9:16",
  SIXTEEN_NINE = "16:9",
}

export enum ResolverStatus {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  PENDING = "PENDING",
  PROGRESS = "PROGRESS",
  CANCELED = "CANCELED",
}

export enum PexelsOrientation {
  LANDSCAPE = "landscape",
  PORTRAIT = "portrait",
  SQUARE = "square",
}

export enum PexelsSize {
  LARGE = "large",
  MEDIUM = "medium",
  SMALL = "small",
}
