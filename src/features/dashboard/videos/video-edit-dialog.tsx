"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DashboardVideoData } from "./video-grid";

export function VideoEditDialog({
  video,
  open,
  onOpenChange,
}: {
  video: DashboardVideoData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(video?.title || "");
  const [description, setDescription] = useState(video?.description || "");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local state when video changes
  useEffect(() => {
    if (video) {
      setTitle(video.title || "");
      setDescription(video.description || "");
      setThumbnailFile(null);
      setThumbnailPreview(null);
      setRemoveThumbnail(false);
      setError(null);
    }
  }, [video]);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [thumbnailFile]);

  const handleSave = async () => {
    if (!video) return;
    setError(null);
    setIsLoading(true);

    try {
      let thumbnailS3Key: string | null | undefined;

      if (thumbnailFile) {
        const initRes = await fetch("/api/s3/upload-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: thumbnailFile.name,
            contentType: thumbnailFile.type || "application/octet-stream",
            size: thumbnailFile.size,
          }),
        });

        if (!initRes.ok) {
          const initJson = await initRes.json().catch(() => ({}));
          throw new Error(
            initJson.error || "Failed to initialize thumbnail upload",
          );
        }

        const initJson = await initRes.json();

        const uploadRes = await fetch(initJson.presignedURL, {
          method: "PUT",
          headers: {
            "content-type": thumbnailFile.type || "application/octet-stream",
          },
          body: thumbnailFile,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload thumbnail to storage");
        }

        thumbnailS3Key = initJson.key;
      } else if (removeThumbnail) {
        thumbnailS3Key = null;
      }

      const body: Record<string, unknown> = { title, description };
      if (thumbnailS3Key !== undefined) {
        body.thumbnailS3Key = thumbnailS3Key;
      }

      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to save changes");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Video Details</DialogTitle>
        </DialogHeader>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
            {error}
          </div>
        )}
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Alpha - Final Render"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="thumbnailFile">Thumbnail</Label>

            {(thumbnailPreview ||
              (video?.thumbnailS3Key && !removeThumbnail)) && (
              <div className="overflow-hidden rounded-xl border bg-slate-950/5">
                <img
                  src={
                    thumbnailPreview
                      ? thumbnailPreview
                      : video?.thumbnailS3Key
                        ? `/api/s3/thumbnail/${video.thumbnailS3Key}`
                        : undefined
                  }
                  alt="Video thumbnail preview"
                  className="h-36 w-full object-cover"
                />
              </div>
            )}

            <Input
              id="thumbnailFile"
              type="file"
              accept="image/*"
              onChange={(e) => {
                setThumbnailFile(e.target.files?.[0] ?? null);
                setRemoveThumbnail(false);
              }}
              disabled={isLoading}
            />
            {video?.thumbnailS3Key && !thumbnailPreview && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setRemoveThumbnail((current) => !current)}
              >
                {removeThumbnail
                  ? "Keep current thumbnail"
                  : "Remove current thumbnail"}
              </Button>
            )}
            <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3">
              <p className="text-xs text-blue-400 font-medium mb-1">
                Thumbnail Requirements:
              </p>
              <ul className="text-[10px] text-white/50 space-y-1 list-disc list-inside">
                <li>Recommended: 1280×720 (16:9 aspect ratio)</li>
                <li>Format: JPG or PNG</li>
                <li>Max file size: 5MB</li>
              </ul>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
