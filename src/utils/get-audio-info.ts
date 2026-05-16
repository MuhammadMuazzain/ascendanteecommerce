import { exec } from "child_process";
import { promisify } from "util";
import { ffprobeStatic } from "./ffmpeg-config";

const execAsync = promisify(exec);

export const getAudioInfo = async (src: string): Promise<{ duration: number }> => {
  try {
    // Use ffprobe from static binaries if available, otherwise use system ffprobe
    const ffprobePath = ffprobeStatic || "ffprobe";
    const cmd = ffprobeStatic
      ? `"${ffprobePath}" -v quiet -print_format json -show_format "${src}"`
      : `${ffprobePath} -v quiet -print_format json -show_format "${src}"`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);

    // Convert duration from seconds to milliseconds
    const duration = parseFloat(data.format.duration) * 1000;
    return { duration };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get audio info: ${errorMessage}`);
  }
};
