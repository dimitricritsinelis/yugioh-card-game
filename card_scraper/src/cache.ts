import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { cardSlugFromUrl } from "./normalize.js";

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function htmlCachePath(outDir: string, detailUrl: string): string {
  return path.join(outDir, ".cache", "html", `${cardSlugFromUrl(detailUrl)}.html`);
}

export async function readCachedHtml(outDir: string, detailUrl: string): Promise<string | null> {
  const filePath = htmlCachePath(outDir, detailUrl);
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function writeCachedHtml(outDir: string, detailUrl: string, html: string): Promise<string> {
  const filePath = htmlCachePath(outDir, detailUrl);
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, html, "utf8");
  return filePath;
}

export async function atomicWriteFile(filePath: string, data: Buffer | string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, data);
  await import("node:fs/promises").then((fs) => fs.rename(tempPath, filePath));
}
