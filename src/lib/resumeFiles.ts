import fs from "fs/promises";
import path from "path";
import { del, get, put } from "@vercel/blob";
import { APP_CONSTANTS } from "@/lib/constants";
import { getTimestampedFileName } from "@/lib/utils";
import { log } from "@/lib/telemetry";

export interface ResumeUpload {
  fileName: string;
  filePath: string;
}

// Resume files live in a private Vercel Blob store when BLOB_READ_WRITE_TOKEN
// is set (Vercel), and on disk otherwise (local dev, Docker). Blob files are
// stored in File.filePath as "blob:<pathname>" so both kinds can coexist.
const BLOB_PREFIX = "blob:";
const BLOB_DIR = "resumes/";

function blobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isBlobPath(filePath: string): boolean {
  return filePath.startsWith(BLOB_PREFIX);
}

function blobPathname(filePath: string): string {
  return filePath.slice(BLOB_PREFIX.length);
}

// A function, not a constant: tests override UPLOADS_DIR at runtime.
// Never UPLOADS_DIR itself — it also holds the database and backups.
export function resumesDir(): string {
  return path.resolve(APP_CONSTANTS.UPLOADS_DIR, "files", "resumes");
}

// The trailing separator keeps a sibling such as resumes-old from passing
export function isResumeFilePath(filePath: string): boolean {
  if (isBlobPath(filePath)) {
    const pathname = blobPathname(filePath);
    return (
      pathname.startsWith(BLOB_DIR) &&
      !pathname.includes("..") &&
      pathname.length > BLOB_DIR.length
    );
  }
  return path.resolve(filePath).startsWith(resumesDir() + path.sep);
}

function contentTypeFor(fileName: string): string {
  return path.extname(fileName).toLowerCase() === ".pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

// The path is built here and never taken from a caller
export async function saveResumeUpload(
  fileName: string,
  bytes: Uint8Array,
): Promise<ResumeUpload> {
  if (blobStorageEnabled()) {
    const blob = await put(
      `${BLOB_DIR}${getTimestampedFileName(fileName)}`,
      Buffer.from(bytes),
      {
        access: "private",
        addRandomSuffix: true,
        contentType: contentTypeFor(fileName),
      },
    );
    return { fileName, filePath: `${BLOB_PREFIX}${blob.pathname}` };
  }
  const dir = path.join(APP_CONSTANTS.UPLOADS_DIR, "files", "resumes");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, getTimestampedFileName(fileName));
  await fs.writeFile(filePath, bytes);
  return { fileName, filePath };
}

// Returns null when the file is gone. Callers must check isResumeFilePath
// first; this does not re-validate the path.
export async function readResumeFile(filePath: string): Promise<Buffer | null> {
  try {
    if (isBlobPath(filePath)) {
      const res = await get(blobPathname(filePath), { access: "private" });
      if (!res || res.statusCode !== 200) return null;
      return Buffer.from(await new Response(res.stream).arrayBuffer());
    }
    return await fs.readFile(path.resolve(filePath));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      log.warn("[Resume] Could not read file", {
        "file.path": filePath,
        error: String(error),
      });
    }
    return null;
  }
}

// Never throws: callers run it after a commit that must not be undone
export async function removeResumeFile(filePath: string): Promise<void> {
  if (!isResumeFilePath(filePath)) {
    log.warn("[Resume] Skipped unlinking a path outside the resumes directory", {
      "file.path": filePath,
    });
    return;
  }
  if (isBlobPath(filePath)) {
    await del(blobPathname(filePath)).catch((error: unknown) => {
      log.warn("[Resume] Could not remove blob", {
        "file.path": filePath,
        error: String(error),
      });
    });
    return;
  }
  await fs.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return;
    log.warn("[Resume] Could not remove file", {
      "file.path": filePath,
      error: String(error),
    });
  });
}
