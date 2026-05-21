import crypto from "node:crypto";
import path from "node:path";
import { imageSize } from "image-size";
import type { CardRecord } from "./schema.js";
import { atomicWriteFile, ensureDir, fileExists } from "./cache.js";
import { resolveImageCandidates } from "./normalize.js";

export type DownloadImageOptions = {
  outDir: string;
  force: boolean;
  userAgent: string;
};

export async function downloadCardImage(card: CardRecord, options: DownloadImageOptions): Promise<CardRecord> {
  const imageDir = path.join(options.outDir, "images");
  await ensureDir(imageDir);
  const filePath = path.join(imageDir, card.file_name);
  const existing = await fileExists(filePath);
  if (existing && !options.force) {
    const buffer = await import("node:fs/promises").then((fs) => fs.readFile(filePath));
    const dimensions = imageSize(buffer);
    return {
      ...card,
      image: {
        ...card.image,
        file_path: filePath,
        byte_size: buffer.byteLength,
        width: dimensions.width ?? null,
        height: dimensions.height ?? null,
        sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
        status: "cached",
        error: null
      }
    };
  }

  const candidates = resolveImageCandidates(card.image.source_src, card.passcode);
  const errors: string[] = [];
  for (const url of candidates) {
    try {
      const response = await fetch(url, { headers: { "user-agent": options.userAgent } });
      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        errors.push(`${url}: ${response.status} ${response.statusText}`);
        continue;
      }
      if (!contentType?.toLowerCase().startsWith("image/")) {
        errors.push(`${url}: non-image content-type ${contentType ?? "unknown"}`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.byteLength) {
        errors.push(`${url}: empty response`);
        continue;
      }
      const dimensions = imageSize(buffer);
      await atomicWriteFile(filePath, buffer);
      return {
        ...card,
        image: {
          ...card.image,
          resolved_url: url,
          file_path: filePath,
          content_type: contentType,
          byte_size: buffer.byteLength,
          width: dimensions.width ?? null,
          height: dimensions.height ?? null,
          sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
          status: "downloaded",
          error: null
        }
      };
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    ...card,
    image: {
      ...card.image,
      file_path: filePath,
      status: "failed",
      error: errors.join("; ")
    }
  };
}
