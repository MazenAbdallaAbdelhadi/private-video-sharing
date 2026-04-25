"use client";

import { FileVideo, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { DashboardVideoData } from "./video-grid";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function VideoCard({ video, onEdit }: { video: DashboardVideoData; onEdit: () => void }) {
  const sizeMB = (video.size / 1024 / 1024).toFixed(2);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="group rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col hover:border-violet-500/50 transition-colors">
      <div className="aspect-video bg-muted relative border-b overflow-hidden">
        {video.thumbnailS3Key ? (
          <img 
            src={`/api/s3/thumbnail/${video.thumbnailS3Key}`} // Placeholder endpoint
            alt={video.title || "Thumbnail"}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
            <FileVideo size={48} />
          </div>
        )}
        
        {video.durationSeconds && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs font-mono">
            {formatDuration(video.durationSeconds)}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm line-clamp-2" title={video.title || video.id}>
            {video.title || "Untitled Video"}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" /> Edit Metadata
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete Video
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>{sizeMB} MB</span>
          <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
        </div>
        
        {video.clientPagesCount > 0 && (
          <div className="text-xs text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-1 rounded w-fit mt-1">
            Used in {video.clientPagesCount} page{video.clientPagesCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
