"use client";

import { Play } from "lucide-react";

type VideoSummary = {
  id: string;
  title: string | null;
  durationSeconds: number | null;
};

type EngagementData = Record<string, { totalTimeSeconds: number; plays: number }>;

export function VideoEngagementChart({ 
  videos, 
  engagement 
}: { 
  videos: VideoSummary[]; 
  engagement: EngagementData;
}) {
  if (videos.length === 0) {
    return <p className="text-muted-foreground italic">No videos in this link.</p>;
  }

  return (
    <div className="space-y-6">
      {videos.map(video => {
        const stats = engagement[video.id] || { totalTimeSeconds: 0, plays: 0 };
        const duration = video.durationSeconds || 1; // avoid div by 0
        const percentage = Math.min(100, Math.round((stats.totalTimeSeconds / duration) * 100));
        
        return (
          <div key={video.id} className="space-y-2">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="font-medium text-sm line-clamp-1">{video.title || "Untitled Video"}</p>
                <div className="flex gap-4 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1"><Play size={12} /> {stats.plays} plays</span>
                  <span>Max Watch: {Math.floor(stats.totalTimeSeconds)}s / {video.durationSeconds || "?"}s</span>
                </div>
              </div>
              <span className="font-bold text-lg text-violet-600 dark:text-violet-400">
                {percentage}%
              </span>
            </div>
            
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-500 transition-all duration-1000 ease-out" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
