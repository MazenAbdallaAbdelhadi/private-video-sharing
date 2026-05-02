"use client";

import { formatDistanceToNow } from "date-fns";
import { Play, Pause, FastForward, Eye, ShieldAlert, MonitorPlay, Activity } from "lucide-react";

type EventType = string;

type EventLog = {
  id: string;
  createdAt: string;
  type: EventType;
  ip: string | null;
  userAgent: string | null;
  videoId: string | null;
  details: any;
};

type VideoSummary = {
  id: string;
  title: string | null;
};

const EventIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "first_access":
    case "init":
    case "page_view":
      return <Eye size={16} className="text-blue-500" />;
    case "video_start":
      return <MonitorPlay size={16} className="text-green-500" />;
    case "video_pause":
      return <Pause size={16} className="text-amber-500" />;
    case "video_seek":
      return <FastForward size={16} className="text-purple-500" />;
    case "heartbeat":
      return <Activity size={16} className="text-emerald-500" />;
    case "devtools_detected":
    case "window_blur":
    case "fullscreen_exit":
    case "visibility_hidden":
    case "ip_mismatch":
    case "session_mismatch":
      return <ShieldAlert size={16} className="text-red-500" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-muted-foreground" />;
  }
};

const formatEventType = (type: string) => {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export function ActivityTimeline({ events, videos }: { events: EventLog[], videos: VideoSummary[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground italic text-sm">No activity recorded yet.</p>;
  }

  const getVideoTitle = (id: string | null) => {
    if (!id) return null;
    return videos.find(v => v.id === id)?.title || "Unknown Video";
  };

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
      {events.map((event) => (
        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <EventIcon type={event.type} />
          </div>
          
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{formatEventType(event.type)}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              </span>
            </div>
            
            {event.videoId && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                Video: {getVideoTitle(event.videoId)}
              </p>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              {event.ip && <p>IP: <span className="font-mono">{event.ip}</span></p>}
              {event.userAgent && (
                <p className="truncate" title={event.userAgent}>
                  Device: {event.userAgent.split(" ")[0]}...
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
