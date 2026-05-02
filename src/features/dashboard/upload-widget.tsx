"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadInitResponse = {
  presignedURL: string;
  key: string;
};

async function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
  xhrRef: React.MutableRefObject<XMLHttpRequest | null>,
) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress(pct);
    };

    xhr.onload = () => {
      xhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Failed to upload to storage"));
    };
    xhr.onerror = () => {
      xhrRef.current = null;
      reject(new Error("Failed to upload to storage"));
    };
    xhr.onabort = () => {
      xhrRef.current = null;
      reject(new Error("Upload aborted"));
    };
    xhr.send(file);
  });
}

export function UploadWidget() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const accept = useMemo(() => "video/mp4,video/*", []);

  const handleAbort = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setIsUploading(false);
      setProgress(0);
      setError("Upload cancelled");
    }
  }, []);

  const onUpload = useCallback(async () => {
    if (!file) return;
    setError(null);
    setIsUploading(true);
    setProgress(0);
    try {
      const initRes = await fetch("/api/s3/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!initRes.ok) {
        throw new Error("Failed to initialize upload");
      }

      const initJson = (await initRes.json()) as UploadInitResponse;

      await uploadWithProgress(initJson.presignedURL, file, setProgress, xhrRef);

      const createRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          s3Key: initJson.key,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      if (!createRes.ok) {
        throw new Error("Failed to create video record");
      }

      setFile(null);
      // Reset input manually if needed or just rely on state
      const input = document.getElementById("videoFile") as HTMLInputElement;
      if (input) input.value = "";

      setProgress(100);
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message === "Upload aborted") {
        // Handled in handleAbort
        return;
      }
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [file, router]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="videoFile">Video file</Label>
        <Input
          id="videoFile"
          type="file"
          accept={accept}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          disabled={isUploading}
        />
        <p className="text-xs text-muted-foreground">
          Best results: MP4. This upload is private; viewers need a server-issued
          token to access playback.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {!isUploading ? (
          <Button onClick={() => void onUpload()} disabled={!file || isUploading}>
            Upload
          </Button>
        ) : (
          <Button variant="outline" onClick={handleAbort} className="text-red-500 hover:text-red-600 hover:bg-red-50">
            <X className="w-4 h-4 mr-2" /> Cancel Upload
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {isUploading && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
            <span>UPLOADING...</span>
            <span>{progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

