"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Plus,
  Trash2,
  Video as VideoIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type VideoData = {
  id: string;
  title: string | null;
  durationSeconds: number | null;
  thumbnailS3Key: string | null;
};

type PageVideo = {
  id: string;
  videoId: string;
  sortOrder: number;
  video: VideoData;
};

export function VideoPicker({
  pageId,
  allVideos,
  pageVideos,
  onPageVideosChange,
}: {
  pageId: string;
  allVideos: VideoData[];
  pageVideos: PageVideo[];
  onPageVideosChange: (updatedVideos: PageVideo[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedVideos = [...pageVideos].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const linkedVideoIds = new Set(pageVideos.map((pv) => pv.videoId));
  const availableVideos = allVideos.filter((v) => !linkedVideoIds.has(v.id));

  const reorderVideos = (
    videos: PageVideo[],
    fromIndex: number,
    toIndex: number,
  ) => {
    const updated = [...videos];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    return updated.map((video, index) => ({ ...video, sortOrder: index }));
  };

  const handleAddVideo = async (videoId: string) => {
    setError(null);
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/client-pages/${pageId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result) {
        onPageVideosChange([...pageVideos, result]);
        setOpen(false);
      } else {
        setError(result?.error || "Failed to add video");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add video");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!confirm("Remove this video from the page?")) return;
    setError(null);
    setIsUpdating(true);
    try {
      const res = await fetch(
        `/api/client-pages/${pageId}/videos?videoId=${videoId}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        onPageVideosChange(pageVideos.filter((pv) => pv.videoId !== videoId));
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to remove video");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove video");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMoveVideo = async (fromIndex: number, toIndex: number) => {
    const reordered = reorderVideos(sortedVideos, fromIndex, toIndex);
    setError(null);
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/client-pages/${pageId}/videos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoOrders: reordered.map((video) => ({
            videoId: video.videoId,
            sortOrder: video.sortOrder,
          })),
        }),
      });
      if (res.ok) {
        onPageVideosChange(reordered);
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to reorder videos");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder videos");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const thumbnailUrl = (key: string) => `/api/s3/thumbnail/${encodeURI(key)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold border-b pb-2 flex-1">Selected Videos</h3>
        {error && (
          <span className="text-xs text-red-500 ml-4 animate-pulse">
            {error}
          </span>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="ml-4 -mt-2">
              <Plus className="mr-2 h-4 w-4" /> Add Video
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Video to Page</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-2">
              {availableVideos.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                  No more videos available to add. Upload new videos from the
                  Video Library.
                </div>
              ) : (
                availableVideos.map((video) => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-14 bg-muted rounded overflow-hidden shrink-0 flex items-center justify-center relative">
                        {video.thumbnailS3Key ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl(video.thumbnailS3Key)}
                            alt="thumb"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <VideoIcon
                            size={20}
                            className="text-muted-foreground/50"
                          />
                        )}
                        {video.durationSeconds && (
                          <span className="absolute bottom-1 right-1 text-[10px] bg-black/70 text-white px-1 rounded font-mono">
                            {formatDuration(video.durationSeconds)}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-sm line-clamp-1">
                        {video.title || "Untitled Video"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddVideo(video.id)}
                      disabled={isUpdating}
                    >
                      Add
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {sortedVideos.length === 0 ? (
          <div className="text-sm text-muted-foreground italic border border-dashed p-4 rounded text-center">
            No videos added yet. Click Add Video to select from your library.
          </div>
        ) : (
          sortedVideos.map((pv, index) => (
            <div
              key={pv.id}
              className="flex items-center gap-3 p-2 border rounded-md bg-card"
            >
              <div className="cursor-grab text-muted-foreground hover:text-foreground">
                <GripVertical size={16} />
              </div>
              <div className="w-16 h-9 bg-muted rounded overflow-hidden shrink-0 flex items-center justify-center relative">
                {pv.video.thumbnailS3Key ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnailUrl(pv.video.thumbnailS3Key)}
                    alt="thumb"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <VideoIcon size={14} className="text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {pv.video.title || "Untitled Video"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveVideo(index, index - 1)}
                  disabled={isUpdating || index === 0}
                  aria-label="Move video up"
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveVideo(index, index + 1)}
                  disabled={isUpdating || index === sortedVideos.length - 1}
                  aria-label="Move video down"
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
                  onClick={() => handleRemoveVideo(pv.videoId)}
                  disabled={isUpdating}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
