"use client";

import { useState } from "react";
import { VideoCard } from "./video-card";
import { VideoEditDialog } from "./video-edit-dialog";

export type DashboardVideoData = {
  id: string;
  createdAt: string;
  contentType: string;
  size: number;
  s3Key: string;
  title: string | null;
  description: string | null;
  thumbnailS3Key: string | null;
  durationSeconds: number | null;
  clientPagesCount: number;
};

export function VideoGrid({ videos }: { videos: DashboardVideoData[] }) {
  const [editingVideo, setEditingVideo] = useState<DashboardVideoData | null>(
    null,
  );

  if (videos.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-card text-muted-foreground border-dashed">
        <p>No videos uploaded yet. Upload your first video above.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onEdit={() => setEditingVideo(video)}
          />
        ))}
      </div>

      <VideoEditDialog
        video={editingVideo}
        open={!!editingVideo}
        onOpenChange={(open) => {
          if (!open) setEditingVideo(null);
        }}
      />
    </>
  );
}
