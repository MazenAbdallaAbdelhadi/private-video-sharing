"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from "lucide-react";

type CustomVideoControlsProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onToggleFullscreen: () => void;
};

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CustomVideoControls({
  videoRef,
  onToggleFullscreen,
}: CustomVideoControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const speedOptions = [1, 1.25, 1.5, 2, 3, 4] as const;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const onVolumeChange = () => setIsMuted(video.muted);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("volumechange", onVolumeChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("volumechange", onVolumeChange);
    };
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate, videoRef]);

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      clearTimeout(timeout);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current?.pause();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      const time = (val / 100) * duration;
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div
      className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-500 z-40 ${
        showControls ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: showControls
          ? "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 20%)"
          : "transparent",
      }}
    >
      <div className="flex items-center gap-4 text-white">
        <button
          onClick={togglePlay}
          className="hover:text-violet-400 transition-colors"
        >
          {isPlaying ? (
            <Pause size={24} />
          ) : (
            <Play size={24} fill="currentColor" />
          )}
        </button>

        <div className="flex items-center gap-2 text-sm font-mono w-full max-w-[80%] mx-auto">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress || 0}
            onChange={handleSeek}
            className="w-full accent-violet-500 h-1.5 rounded-full cursor-pointer bg-white/30"
          />
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-1">
          {speedOptions.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackRate(speed)}
              className={`rounded-full px-2 py-1 text-[11px] transition-colors ${
                playbackRate === speed
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        <button
          onClick={toggleMute}
          className="hover:text-violet-400 transition-colors"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
        <button
          onClick={onToggleFullscreen}
          className="hover:text-violet-400 transition-colors"
        >
          {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>
      </div>
    </div>
  );
}
