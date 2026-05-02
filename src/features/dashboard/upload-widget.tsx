"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VideoCard } from "./videos/video-card";
import { DashboardVideoData } from "./videos/video-grid";

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
  const [lastUploadedVideo, setLastUploadedVideo] = useState<DashboardVideoData | null>(null);
  
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

  const resetUpload = () => {
    setFile(null);
    setLastUploadedVideo(null);
    setProgress(0);
    setError(null);
    const input = document.getElementById("videoFile") as HTMLInputElement;
    if (input) input.value = "";
  };

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

      const result = await createRes.json();

      // Construct a temporary video data object for preview
      const newVideo: DashboardVideoData = {
        id: result.videoId,
        createdAt: result.createdAt,
        contentType: file.type || "application/octet-stream",
        size: file.size,
        s3Key: initJson.key,
        title: file.name,
        description: null,
        thumbnailS3Key: null,
        durationSeconds: null,
        clientPagesCount: 0,
      };

      setLastUploadedVideo(newVideo);
      setFile(null);
      setProgress(100);
      router.refresh();
    } catch (e) {
      if (e instanceof Error && e.message === "Upload aborted") {
        return;
      }
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [file, router]);

  if (lastUploadedVideo) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Upload Successful!</p>
            <p className="text-xs opacity-80">Your video is now secured and ready for delivery.</p>
          </div>
          <Button size="sm" variant="ghost" onClick={resetUpload} className="text-blue-400 hover:bg-blue-400/10">
            Upload Another
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono tracking-widest uppercase text-white/30">Library Preview</h3>
            <span className="h-px flex-1 bg-white/5 ml-4" />
          </div>
          
          <div className="max-w-sm">
            <VideoCard video={lastUploadedVideo} onEdit={() => {}} />
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-white/20 px-1 italic">
            <ArrowRight className="w-3 h-3" />
            <span>This is how your video will appear in the dashboard grid.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="videoFile" className="text-white/60">Select Video File</Label>
        <Input
          id="videoFile"
          type="file"
          accept={accept}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          disabled={isUploading}
          className="bg-black/20 border-white/5 focus:border-blue-500/50 transition-colors"
        />
        <p className="text-[10px] text-white/30">
          Best results: MP4. All uploads are encrypted and private by default.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {!isUploading ? (
          <Button 
            onClick={() => void onUpload()} 
            disabled={!file || isUploading}
            className="perapixel-bg-blue hover:bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            Start Upload
          </Button>
        ) : (
          <Button variant="outline" onClick={handleAbort} className="text-red-500 border-red-500/20 hover:bg-red-500/10">
            <X className="w-4 h-4 mr-2" /> Abort Upload
          </Button>
        )}
        {error && <p className="text-sm text-red-400 animate-pulse">{error}</p>}
      </div>

      {isUploading && (
        <div className="space-y-2 pt-2">
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-[width] duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-white/40 font-mono tracking-tighter">
            <span className="animate-pulse">ENCRYPTING & UPLOADING...</span>
            <span className="text-blue-400 font-bold">{progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

