"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { VideoGallery } from "./video-gallery";
import "./client-view.css";

type PageData = {
  heroTitle: string;
  heroSubtitle: string | null;
  heroBackgroundS3Key: string | null;
  aboutText: string | null;
  brandLogoS3Key: string | null;
  accentColor: string;
  showEditorName: boolean;
  brandName: string | null;
  clientName: string | null;
  clientEmail: string | null;
};

type VideoData = {
  id: string;
  title: string | null;
  description: string | null;
  thumbnailS3Key: string | null;
  durationSeconds: number | null;
};

type Props = {
  token: string;
};

export function ClientPageLayout({ token }: Props) {
  const router = useRouter();
  const [data, setData] = useState<{
    page: PageData;
    videos: VideoData[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fp, setFp] = useState<string | null>(null);

  useEffect(() => {
    // We add the dark class to html to force dark mode for the client view
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const invalidate = useCallback(
    async (reason: "devtools_detected") => {
      if (!fp) return;
      try {
        await fetch(`/api/c/${encodeURIComponent(token)}/revoke`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-device-fingerprint": fp,
          },
          body: JSON.stringify({ reason }),
        });
      } finally {
        router.replace("/link-expired");
      }
    },
    [token, router, fp],
  );

  useEffect(() => {
    if (!data) return; // Only arm after data is loaded

    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 1500);

    const devtoolsInterval = window.setInterval(() => {
      if (!armed) return;
      const widthDelta = Math.abs(window.outerWidth - window.innerWidth);
      const heightDelta = Math.abs(window.outerHeight - window.innerHeight);
      const devtoolsLikely = widthDelta > 160 || heightDelta > 160;
      if (devtoolsLikely) {
        void invalidate("devtools_detected");
      }
    }, 1000);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!armed) return;
      // Prevent F1-F12 keys which are often used for screen recording or devtools
      if (e.key.startsWith("F") && !isNaN(Number(e.key.slice(1)))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      clearTimeout(armTimer);
      window.clearInterval(devtoolsInterval);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [data, invalidate]);

  useEffect(() => {
    async function initPage() {
      try {
        const { generateDeviceFingerprint } = await import("@/lib/fingerprint");
        const generatedFp = await generateDeviceFingerprint();
        setFp(generatedFp);

        const res = await fetch(`/api/c/${encodeURIComponent(token)}/init`, {
          method: "POST",
          headers: {
            "x-device-fingerprint": generatedFp,
          },
        });

        if (!res.ok) throw new Error("Link invalid, expired, or revoked.");

        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error(err);
        router.replace("/link-expired");
      }
    }

    initPage();
  }, [token, router]);

  if (error) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-black text-white p-6">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-black text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-t-2 border-violet-500 animate-spin" />
          <p className="text-white/50 text-sm tracking-widest uppercase font-mono">
            Loading Secure Environment
          </p>
        </div>
      </div>
    );
  }

  const { page, videos } = data;

  return (
    <div
      className="min-h-svh client-view-bg text-white font-sans selection:bg-violet-500/30"
      style={{ "--accent-color": page.accentColor } as React.CSSProperties}
    >
      <div className="max-w-6xl mx-auto px-6 py-12 md:py-24 space-y-24">
        <header className="space-y-6 max-w-3xl relative z-10 animate-fade-in-up">
          {page.showEditorName && page.brandName && (
            <div className="text-violet-400 font-mono tracking-wider text-sm uppercase">
              {page.brandName}
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-white/90">
            {page.heroTitle}
          </h1>

          {page.heroSubtitle && (
            <p className="text-xl md:text-2xl text-white/60 font-light leading-relaxed max-w-2xl">
              {page.heroSubtitle}
            </p>
          )}

          {page.clientName && (
            <div className="inline-block mt-8 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm backdrop-blur-md">
              Prepared securely for{" "}
              <span className="text-white font-medium">{page.clientName}</span>
            </div>
          )}
        </header>

        <main className="animate-fade-in-up delay-100">
          <VideoGallery
            token={token}
            videos={videos}
            clientName={page.clientName}
            clientEmail={page.clientEmail}
            brandName={page.brandName}
          />
        </main>

        {page.aboutText && (
          <section className="glass-card rounded-2xl p-8 md:p-12 max-w-3xl relative z-10 animate-fade-in-up delay-200">
            <h2 className="text-sm font-mono tracking-widest uppercase text-white/40 mb-6">
              About
            </h2>
            <div className="prose prose-invert prose-p:leading-relaxed prose-p:text-white/70 max-w-none">
              <p>{page.aboutText}</p>
            </div>
          </section>
        )}

        <footer className="pt-20 pb-10 border-t border-white/10 flex flex-col items-center justify-center gap-4 text-white/40 text-sm relative z-10 animate-fade-in-up delay-300">
          <p>
            &copy; {new Date().getFullYear()} {page.brandName || "Editor"}. All
            rights reserved.
          </p>
          <p className="flex items-center gap-2 opacity-50 text-xs">
            Powered by Monteer Secure Delivery
          </p>
        </footer>
      </div>
    </div>
  );
}
