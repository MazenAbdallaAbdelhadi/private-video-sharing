"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
};

type InitResponse = {
  videoId: string;
  expiresAt: string;
};

type PlayResponse = {
  url: string;
  expiresInSeconds: number;
};

export function VideoViewer({ token }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const enforcementRef = useRef<{
    armedAtMs: number | null;
    armTimer: number | null;
  }>({ armedAtMs: null, armTimer: null });

  const [isValidating, setIsValidating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const speedOptions = [1, 1.25, 1.5, 2, 3, 4] as const;

  const apiBase = useMemo(() => `/api/v/${encodeURIComponent(token)}`, [token]);

  const invalidate = useCallback(
    async (reason: "devtools_detected") => {
      try {
        await fetch(`${apiBase}/revoke`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } finally {
        try {
          videoRef.current?.pause();
        } catch {}
        router.replace("/link-expired");
      }
    },
    [apiBase, router],
  );

  const fetchPlayUrl = useCallback(async () => {
    const res = await fetch(`${apiBase}/play`, { method: "GET" });
    if (!res.ok) throw new Error("play_failed");
    const data = (await res.json()) as PlayResponse;
    setVideoUrl(data.url);
  }, [apiBase]);

  const init = useCallback(async () => {
    setIsValidating(true);
    const res = await fetch(`${apiBase}/init`, { method: "POST" });
    if (!res.ok) {
      router.replace("/link-expired");
      return;
    }
    const data = (await res.json()) as InitResponse;
    setExpiresAt(new Date(data.expiresAt));
    setIsReady(true);
    setIsValidating(false);
  }, [apiBase, router]);

  const armEnforcementSoon = useCallback(() => {
    // Arm enforcement shortly after playback starts.
    if (enforcementRef.current.armTimer) {
      window.clearTimeout(enforcementRef.current.armTimer);
    }
    enforcementRef.current.armedAtMs = null;
    enforcementRef.current.armTimer = window.setTimeout(() => {
      enforcementRef.current.armedAtMs = Date.now();
      enforcementRef.current.armTimer = null;
    }, 1200);
  }, []);

  useEffect(() => {
    void (async () => {
      await init();
      await fetchPlayUrl();
    })();
  }, [init, fetchPlayUrl]);

  useEffect(() => {
    if (!videoUrl) return;
    armEnforcementSoon();
  }, [videoUrl, armEnforcementSoon]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Best-effort: prevent common function-key shortcuts that can exit fullscreen
      // or steal focus (browser/OS dependent).
      if (e.key.startsWith("F")) {
        const n = Number(e.key.slice(1));
        if (Number.isFinite(n) && n >= 1 && n <= 12) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  useEffect(() => {
    if (!videoUrl) return;
    // Best-effort devtools detection. Not foolproof, but catches common cases.
    const interval = window.setInterval(() => {
      const armedAtMs = enforcementRef.current.armedAtMs;
      if (!armedAtMs) return;
      if (Date.now() - armedAtMs < 1500) return;

      const widthDelta = Math.abs(window.outerWidth - window.innerWidth);
      const heightDelta = Math.abs(window.outerHeight - window.innerHeight);
      const devtoolsLikely = widthDelta > 160 || heightDelta > 160;
      if (devtoolsLikely) {
        void invalidate("devtools_detected");
      }
    }, 750);

    return () => window.clearInterval(interval);
  }, [videoUrl, invalidate]);

  return (
    <div
      ref={containerRef}
      className="min-h-svh bg-black text-white flex items-center justify-center relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={videoRef}
        src={videoUrl ?? undefined}
        className="w-full h-full object-contain"
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
      />

      {videoUrl && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs text-white shadow-xl">
          <span className="font-medium">Speed</span>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => setPlaybackRate(speed)}
              className={`rounded-full px-2.5 py-1 transition-colors ${
                playbackRate === speed
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      )}

      {(isValidating || !videoUrl) && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <p className="text-lg font-medium">
              {isValidating ? "Validating link…" : "Preparing secure playback"}
            </p>
            {expiresAt && (
              <p className="text-sm text-white/70">
                Link expires at {expiresAt.toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
