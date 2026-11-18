export interface ChunkUploadProgress {
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  chunkIndex: number;
  totalChunks: number;
}

export interface ChunkUploadResult {
  ok: boolean;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB per binary chunk (bypasses 32MB Cloud Run / proxy limits)

/**
 * Uploads any size document (from 1 KB to 1 GB+) in 4 MB binary chunks
 * to `/api/upload-chunk`, avoiding Base64 memory spikes and HTTP payload limits.
 */
export async function uploadLargeFileChunked(
  file: File,
  onProgress?: (progress: ChunkUploadProgress) => void
): Promise<ChunkUploadResult> {
  const totalBytes = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalBytes / DEFAULT_CHUNK_SIZE));
  const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const contentType = file.type || "application/pdf";

  let lastResult: ChunkUploadResult = {
    ok: true,
    url: "",
    filename: file.name,
    size: totalBytes,
    contentType,
  };

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * DEFAULT_CHUNK_SIZE;
    const end = Math.min(totalBytes, start + DEFAULT_CHUNK_SIZE);
    const blobSlice = file.slice(start, end);
    const arrayBuffer = await blobSlice.arrayBuffer();

    let attempt = 0;
    let chunkSucceeded = false;

    while (attempt < 3 && !chunkSucceeded) {
      attempt++;
      try {
        const res = await fetch("/api/upload-chunk", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-upload-id": uploadId,
            "x-file-name": encodeURIComponent(file.name),
            "x-chunk-index": String(chunkIndex),
            "x-total-chunks": String(totalChunks),
            "x-content-type": contentType,
          },
          body: arrayBuffer,
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || `Chunk ${chunkIndex + 1}/${totalChunks} failed`);
        }

        lastResult = {
          ok: true,
          url: json.url,
          filename: json.filename,
          size: json.size || totalBytes,
          contentType: json.contentType || contentType,
        };
        chunkSucceeded = true;
      } catch (err) {
        if (attempt >= 3) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }

    if (onProgress) {
      const uploadedBytes = end;
      const percent = Math.min(100, Math.round((uploadedBytes / Math.max(1, totalBytes)) * 100));
      onProgress({
        percent,
        uploadedBytes,
        totalBytes,
        chunkIndex: chunkIndex + 1,
        totalChunks,
      });
    }
  }

  return lastResult;
}

export function formatBytesReadable(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
