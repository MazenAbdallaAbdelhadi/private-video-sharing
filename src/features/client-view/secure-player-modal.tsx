"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { WatermarkOverlay } from "./watermark-overlay";
import { CustomVideoControls } from "./custom-video-controls";

type Props = {
  token: string;
  videoId: string | null;
  clientName: string | null;
  clientEmail: string | null;
  brandName: string | null;
  onClose: () => void;
};

type PlayResponse = {
  url: string;
  expiresInSeconds: number;
};

export function SecurePlayerModal({ token, videoId, clientName, clientEmail, brandName, onClose }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const enforcementRef = useRef<{
    armedAtMs: number | null;
    armTimer: NodeJS.Timeout | null;
    heartbeatTimer: NodeJS.Timeout | null;
  }>({ armedAtMs: null, armTimer: null, heartbeatTimer: null });

  const [hasEntered, setHasEntered] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string>("Enter fullscreen to watch securely");
  const [isLoading, setIsLoading] = useState(false);

  const deviceFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    import("@/lib/fingerprint").then(({ generateDeviceFingerprint }) => {
      generateDeviceFingerprint().then((fp) => {
        deviceFingerprintRef.current = fp;
      });
    });
  }, []);

  const apiBase = `/api/c/${encodeURIComponent(token)}`;

  // Removed invalidate since it is now handled by the parent ClientPageLayout

  const ensureFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return false;

    if (document.fullscreenElement === el) return true;

    try {
      await el.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchPlayUrl = useCallback(async () => {
    if (!videoId) return;
    const res = await fetch(`${apiBase}/play/${encodeURIComponent(videoId)}`, { 
      method: "GET",
      headers: {
        "x-device-fingerprint": deviceFingerprintRef.current || ""
      }
    });
    if (!res.ok) throw new Error("play_failed");
    const data = (await res.json()) as PlayResponse;
    setVideoUrl(data.url);
  }, [apiBase, videoId]);

  const armEnforcementSoon = useCallback(() => {
    if (enforcementRef.current.armTimer) {
      clearTimeout(enforcementRef.current.armTimer);
    }
    enforcementRef.current.armedAtMs = null;
    enforcementRef.current.armTimer = setTimeout(() => {
      enforcementRef.current.armedAtMs = Date.now();
      enforcementRef.current.armTimer = null;
    }, 1200);
  }, []);

  const startHeartbeat = useCallback(() => {
    if (enforcementRef.current.heartbeatTimer) clearInterval(enforcementRef.current.heartbeatTimer);
    
    enforcementRef.current.heartbeatTimer = setInterval(() => {
      const vid = videoRef.current;
      if (!vid || !videoId || vid.paused) return;

      fetch(`${apiBase}/heartbeat`, {
        method: "POST",
        headers: { 
          "content-type": "application/json",
          "x-device-fingerprint": deviceFingerprintRef.current || ""
        },
        body: JSON.stringify({
          videoId,
          currentTime: vid.currentTime,
          duration: vid.duration || 0,
        }),
      }).catch(console.error); // Silently fail heartbeat, if it persists it's okay, we don't want to break playback for temporary network drops
    }, 15000); // every 15s
  }, [apiBase, videoId]);

  // Enforcements specifically for the video player
  useEffect(() => {
    if (!hasEntered) return;

    const onFullscreenChange = () => {
      // We no longer close the modal on fullscreen change to allow switching apps
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [hasEntered]);

  // Clean up heartbeat on unmount
  useEffect(() => {
    return () => {
      if (enforcementRef.current.heartbeatTimer) {
        clearInterval(enforcementRef.current.heartbeatTimer);
      }
    };
  }, []);

  const onStart = useCallback(async () => {
    setIsLoading(true);
    
    // Try to enter fullscreen but don't require it
    await ensureFullscreen().catch(() => {});

    setHasEntered(true);
    setOverlayMessage("");
    armEnforcementSoon();
    startHeartbeat();

    try {
      await fetchPlayUrl();
      setTimeout(() => {
        videoRef.current?.play().catch(() => {
          setOverlayMessage("Press play to continue");
        });
      }, 100);
    } catch {
      router.replace("/link-expired");
    } finally {
      setIsLoading(false);
    }
  }, [armEnforcementSoon, ensureFullscreen, fetchPlayUrl, router, startHeartbeat]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      ensureFullscreen();
    }
  }, [ensureFullscreen]);

  const handleManualExit = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {}
    }
    onClose();
  }, [onClose]);

  if (!videoId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div
        ref={containerRef}
        className="w-full h-full bg-black relative flex items-center justify-center secure-player-container"
        onContextMenu={(e) => e.preventDefault()}
      >
        {videoUrl && (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              controls={false} // completely custom
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              playsInline
              onClick={() => {
                if (videoRef.current?.paused) videoRef.current.play();
                else videoRef.current?.pause();
              }}
            />
            {/* Protection overlay prevents right-click on the actual video tag */}
            <div className="protection-overlay" />
            
            <WatermarkOverlay 
              clientName={clientName} 
              clientEmail={clientEmail} 
              brandName={brandName} 
              />
            
            <CustomVideoControls 
              videoRef={videoRef} 
              onToggleFullscreen={toggleFullscreen} 
            />

            {/* Exit button only visible when controls would normally be visible, or when paused */}
            <button
              onClick={handleManualExit}
              className="absolute top-4 right-4 z-50 text-white/50 hover:text-white transition-colors bg-black/40 hover:bg-black/80 rounded-full p-2"
            >
              <X size={24} />
            </button>
          </>
        )}

        {(!hasEntered || overlayMessage || isLoading) && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-[60]">
            <div className="max-w-md w-full text-center space-y-6">
              <p className="text-xl font-medium text-white">
                {isLoading ? "Preparing secure stream..." : overlayMessage || "Ready to watch"}
              </p>
              
              {!isLoading && (
                <div className="flex flex-col gap-3 items-center">
                  <button
                    onClick={onStart}
                    className="rounded-full bg-violet-600 text-white px-8 py-3 font-medium hover:bg-violet-500 transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  >
                    Watch Securely
                  </button>
                  <button
                    onClick={onClose}
                    className="text-sm text-white/60 hover:text-white mt-4 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
