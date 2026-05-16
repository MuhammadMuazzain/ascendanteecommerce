// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

// ffprobe-static is optional and may not be installed
// We'll try to find ffprobe in the same directory as ffmpeg-static,
// or fluent-ffmpeg will use system PATH
//const ffprobeStatic = "ffprobe" // ---- local
const ffprobeStatic: string | null = ffprobeInstaller?.path || null;

// Configure fluent-ffmpeg to use static binaries
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

// Configure ffprobe path
// If ffprobe-static is available, use it; otherwise fluent-ffmpeg will
// look for ffprobe in the system PATH
if (ffprobeStatic) {
  ffmpeg.setFfprobePath(ffprobeStatic);
}

export { ffmpegStatic, ffprobeStatic };
