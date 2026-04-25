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

  const [hasEntered, setHasEntered] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string>(
    "Enter fullscreen to continue watching",
  );

  const apiBase = useMemo(() => `/api/v/${encodeURIComponent(token)}`, [token]);

  const invalidate = useCallback(
    async (reason: "fullscreen_exit" | "visibility_hidden" | "window_blur") => {
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

  const ensureFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return false;

    const isFullscreen =
      document.fullscreenElement === el || document.fullscreenElement != null;
    if (isFullscreen) return true;

    try {
      // Must be called from a user gesture to succeed in most browsers.
      await el.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

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
    // Arm enforcement shortly after fullscreen transition settles.
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
    const onFullscreenChange = () => {
      const el = containerRef.current;
      if (!el) return;

      const armedAtMs = enforcementRef.current.armedAtMs;
      if (!armedAtMs) return;
      // If fullscreen is no longer on *any* element, we treat as exit.
      // We don't require it to be our container because some browsers may fullscreen the <video>.
      if (!document.fullscreenElement) void invalidate("fullscreen_exit");
    };

    const onVisibilityChange = () => {
      const armedAtMs = enforcementRef.current.armedAtMs;
      if (!armedAtMs) return;
      if (Date.now() - armedAtMs < 1000) return; // grace window around fullscreen transition
      if (document.visibilityState === "hidden") void invalidate("visibility_hidden");
    };

    const onBlur = () => {
      const armedAtMs = enforcementRef.current.armedAtMs;
      if (!armedAtMs) return;
      if (Date.now() - armedAtMs < 1000) return; // grace window
      void invalidate("window_blur");
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [invalidate]);

  useEffect(() => {
    if (!hasEntered) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const armedAtMs = enforcementRef.current.armedAtMs;
      if (!armedAtMs) return;

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
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [hasEntered]);

  useEffect(() => {
    if (!hasEntered) return;
    // Best-effort devtools detection. Not foolproof, but catches common cases.
    const interval = window.setInterval(() => {
      const armedAtMs = enforcementRef.current.armedAtMs;
      if (!armedAtMs) return;
      if (Date.now() - armedAtMs < 1500) return;

      const widthDelta = Math.abs(window.outerWidth - window.innerWidth);
      const heightDelta = Math.abs(window.outerHeight - window.innerHeight);
      const devtoolsLikely = widthDelta > 160 || heightDelta > 160;
      if (devtoolsLikely) {
        void invalidate("window_blur");
      }
    }, 750);

    return () => window.clearInterval(interval);
  }, [hasEntered, invalidate]);

  const onStart = useCallback(async () => {
    const ok = await ensureFullscreen();
    if (!ok) {
      setOverlayMessage("Fullscreen mode is required to continue watching");
      return;
    }

    setHasEntered(true);
    setOverlayMessage("");
    armEnforcementSoon();

    try {
      await init();
      await fetchPlayUrl();
      setTimeout(() => {
        void videoRef.current?.play().catch(() => {
          setOverlayMessage("Press play to continue");
        });
      }, 0);
    } catch {
      router.replace("/link-expired");
    }
  }, [armEnforcementSoon, ensureFullscreen, fetchPlayUrl, init, router]);

  const onVideoPlayAttempt = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    if (document.fullscreenElement !== el) {
      try {
        videoRef.current?.pause();
      } catch {}
      setOverlayMessage("Enter fullscreen to continue watching");
    }
  }, []);

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
        onPlay={onVideoPlayAttempt}
      />

      {(!hasEntered || isValidating || overlayMessage || !videoUrl) && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <p className="text-lg font-medium">
              {isValidating
                ? "Validating link…"
                : overlayMessage || "Fullscreen mode is required to continue watching"}
            </p>
            {expiresAt && (
              <p className="text-sm text-white/70">
                Link expires at {expiresAt.toLocaleString()}
              </p>
            )}
            <button
              type="button"
              onClick={() => void onStart()}
              disabled={isValidating}
              className="inline-flex items-center justify-center rounded-md bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-60 disabled:pointer-events-none"
            >
              Enter fullscreen &amp; start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

