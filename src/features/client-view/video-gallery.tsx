"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { SecurePlayerModal } from "./secure-player-modal";

type VideoData = {
  id: string;
  title: string | null;
  description: string | null;
  thumbnailS3Key: string | null;
  durationSeconds: number | null;
};

type Props = {
  token: string;
  videos: VideoData[];
  clientName: string | null;
  clientEmail: string | null;
  brandName: string | null;
};

export function VideoGallery({ token, videos, clientName, clientEmail, brandName }: Props) {
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-20 opacity-50">
        <p>No videos available.</p>
      </div>
    );
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {videos.map((video) => (
          <div
            key={video.id}
            className="glass-card rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)]"
            onClick={() => setActiveVideoId(video.id)}
          >
            <div className="aspect-video relative bg-black/40 overflow-hidden">
              {video.thumbnailS3Key ? (
                // In a real app we'd fetch a signed URL for the thumbnail or have a public bucket for them
                <img 
                  src={`/api/s3/thumbnail/${video.thumbnailS3Key}`} // Placeholder for actual thumbnail implementation
                  alt={video.title || "Video thumbnail"}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/20 to-black">
                  <Play size={48} className="opacity-20" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 border border-white/20 text-white">
                  <Play size={28} className="ml-1" fill="currentColor" />
                </div>
              </div>

              {video.durationSeconds && (
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs font-mono font-medium text-white/90">
                  {formatDuration(video.durationSeconds)}
                </div>
              )}
            </div>
            
            <div className="p-5">
              <h3 className="font-medium text-lg text-white/90 group-hover:text-violet-400 transition-colors line-clamp-1">
                {video.title || "Untitled Video"}
              </h3>
              {video.description && (
                <p className="mt-2 text-sm text-white/50 line-clamp-2">
                  {video.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {activeVideoId && (
        <SecurePlayerModal
          token={token}
          videoId={activeVideoId}
          clientName={clientName}
          clientEmail={clientEmail}
          brandName={brandName}
          onClose={() => setActiveVideoId(null)}
        />
      )}
    </>
  );
}
