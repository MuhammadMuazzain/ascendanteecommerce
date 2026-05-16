import os from "os";
import fs from "fs";
import path from "path";
import { NonRetriableError } from "inngest";

import { getInngestApp } from "../index";
import { config } from "../config";

import { generateId } from "@/utils/id";
import { convertMsToSeconds } from "../utils/common";

import { R2StorageService } from "@/lib/r2-storage";
import { LipSyncService } from "@/lib/lip-sync-generator";

import { cutMedia } from "../services/ffmpeg";

import { downloadVideo, fileUrlToBuffer } from "./common/utils/common";

const inngest = getInngestApp();

export const applyLipsyncToScheme = async (scheme: any, schemeId: string) => {
  const lipsync = new LipSyncService(config.freepik.url, config.freepik.key);

  const storage = new R2StorageService({
    bucketName: config.r2.bucket,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
    accountId: config.r2.accountId,
    cdn: config.r2.cdn,
  });

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lipsync-"));

  await Promise.all(
    scheme.segments.map(async (seg: any) => {
      const clip = seg.clips?.[0];
      if (!clip) return;

      const startTime = clip.display.from;
      await Promise.all(
        (seg.bRolls || []).map(async (broll: any) => {
          if (!seg.textToSpeech?.src || broll.type !== "video" || !broll.url) return;

          const audioPath = await downloadVideo(seg.textToSpeech.src, tmpDir);

          const startBroll = convertMsToSeconds(broll.display.from - startTime);
          const durationBroll = convertMsToSeconds(broll.duration);

          const { buffer, ext: videoExt } = await cutMedia(
            audioPath,
            `${durationBroll}`,
            tmpDir,
            `${startBroll}`,
          );

          const filePath = `VIDEOS/${schemeId}/${seg.id}/BRoll_VIDEO/${generateId()}${videoExt}`;
          const audioUrl = await storage.uploadData(filePath, buffer);

          console.log({
            audioPath,
            startBroll,
            durationBroll,
            audioUrl,
          });
          const url = await lipsync.sync({
            audioUrl: audioUrl,
            videoUrl: broll.url,
          });

          const { buffer: videoBuffer, extension } = await fileUrlToBuffer(url);
          const videoUrl = await storage.uploadData(
            `VIDEOS/${schemeId}/${seg.id}/BRoll_LIPSYNC/${generateId()}.${extension}`,
            videoBuffer,
          );
          broll.url = videoUrl;
        }),
      );
    }),
  );

  await fs.promises.rm(tmpDir, { recursive: true, force: true });
  return scheme;
};

export const schemaLipsync = inngest.createFunction(
  {
    id: "schema-lipsync",
    triggers: { event: "schema/lipsync" },
  },
  async ({ event, step }) => {
    let scheme = event.data.scheme;
    const schemeId = scheme.id;
    try {
      if (!schemeId) throw new Error("Scheme not found");

      scheme = await applyLipsyncToScheme(scheme, schemeId);

      return { scheme };
    } catch (err) {
      console.error("error-error", err);
      throw new NonRetriableError(`Error resolving schema${schemeId ? ` [${schemeId}]` : ""}`, {
        cause: err,
      });
    }
  },
);
