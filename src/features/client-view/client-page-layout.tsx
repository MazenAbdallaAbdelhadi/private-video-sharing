"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { VideoGallery } from "./video-gallery";
import { Moon, ShieldCheck } from "lucide-react";
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
    if (!data) return;

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
          <div className="w-12 h-12 rounded-full border-t-2 border-blue-500 animate-spin" />
          <p className="text-white/50 text-sm tracking-widest uppercase font-mono">
            Loading Secure Environment
          </p>
        </div>
      </div>
    );
  }

  const { page, videos } = data;

  const scrollToGallery = () => {
    const gallery = document.getElementById("video-gallery-section");
    if (gallery) {
      gallery.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-svh client-view-bg text-white font-sans selection:bg-blue-500/30">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="PeraPixel"
              width={"400"}
              height={100}
              className="h-24 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-6">
            {page.clientName && (
              <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  SECURELY PREPARED FOR{" "}
                  <span className="text-white">
                    {page.clientName.toUpperCase()}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 md:pt-60 md:pb-40 flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl relative z-10 animate-fade-in-up">
          <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
            <span className="perapixel-text-blue">PeraPixel</span> Production
          </h1>

          <div className="mb-12">
            <p className="text-xl md:text-3xl text-white/60 font-light italic decorative-underline">
              Bringing your vision to life
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button
              onClick={scrollToGallery}
              className="px-8 py-4 rounded-full perapixel-bg-blue hover:bg-blue-600 text-white font-semibold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
            >
              Explore Your Project
            </button>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <main
        id="video-gallery-section"
        className="max-w-7xl mx-auto px-6 pb-24 animate-fade-in-up delay-100"
      >
        <div className="mb-12 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <h2 className="text-sm font-mono tracking-[0.3em] uppercase text-white/30 whitespace-nowrap">
            Selected Media
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <VideoGallery
          token={token}
          videos={videos}
          clientName={page.clientName}
          clientEmail={page.clientEmail}
          brandName={page.brandName}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 flex flex-col items-center justify-center gap-6 text-white/30 text-sm animate-fade-in-up delay-200">
        <p className="tracking-widest uppercase text-[10px] font-medium">
          &copy; {new Date().getFullYear()} PeraPixel Production. All rights
          reserved.
        </p>
      </footer>

      {/* Premium Footer Image Section */}
      <div className="w-full relative mt-6 animate-fade-in-up delay-300 h-[200px] md:h-[300px] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent z-20" />
        <div className="absolute inset-0 shadow-[inset_0_40px_80px_rgba(0,0,0,0.9)] pointer-events-none z-10" />
        <Image
          src="/footer-image.png"
          alt="PeraPixel Production"
          width={1920}
          height={400}
          className="w-full h-full object-cover opacity-60 scale-105"
          priority
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent z-10" />
      </div>
    </div>
  );
}
