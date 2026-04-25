"use client";

import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type VideoRow = {
  id: string;
  createdAt: string;
  contentType: string;
  size: number;
  s3Key: string;
  linksCount: number;
};

type LinkRow = {
  token: string;
  createdAt: string;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
  revokedAt: string | null;
  lockedIp: string | null;
  consumed: boolean;
  _count: { events: number };
};

type EventRow = {
  id: string;
  createdAt: string;
  type:
    | "first_access"
    | "init"
    | "play"
    | "expired"
    | "revoked"
    | "ip_mismatch"
    | "session_mismatch"
    | "visibility_hidden"
    | "window_blur"
    | "fullscreen_exit";
  ip: string | null;
  userAgent: string | null;
  details: unknown;
};

export function VideoManager({ initialVideos }: { initialVideos: VideoRow[] }) {
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [linksByVideo, setLinksByVideo] = useState<Record<string, LinkRow[]>>(
    {},
  );
  const [eventsByToken, setEventsByToken] = useState<Record<string, EventRow[]>>(
    {},
  );
  const [expiresAtInput, setExpiresAtInput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const shareOrigin = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const loadLinks = useCallback(async (videoId: string) => {
    const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/links/list`);
    if (!res.ok) throw new Error("Failed to load links");
    const json = (await res.json()) as { links: LinkRow[] };
    setLinksByVideo((prev) => ({ ...prev, [videoId]: json.links }));
  }, []);

  const loadEvents = useCallback(async (token: string) => {
    const res = await fetch(`/api/video-links/${encodeURIComponent(token)}/events`);
    if (!res.ok) throw new Error("Failed to load events");
    const json = (await res.json()) as { events: EventRow[] };
    setEventsByToken((prev) => ({ ...prev, [token]: json.events }));
  }, []);

  const onExpandVideo = useCallback(
    async (videoId: string) => {
      setError(null);
      setExpandedVideoId((prev) => (prev === videoId ? null : videoId));

      const shouldLoad =
        expandedVideoId !== videoId && !linksByVideo[videoId]?.length;
      if (!shouldLoad) return;

      try {
        await loadLinks(videoId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load links");
      }
    },
    [expandedVideoId, linksByVideo, loadLinks],
  );

  const onCreateLink = useCallback(
    async (videoId: string) => {
      if (!expiresAtInput) {
        setError("Set an expiresAt time first.");
        return;
      }

      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/links`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ expiresAt: new Date(expiresAtInput).toISOString() }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error || "Failed to create link");
        }
        await loadLinks(videoId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create link");
      } finally {
        setBusy(false);
      }
    },
    [expiresAtInput, loadLinks],
  );

  const onPreview = useCallback(async (videoId: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/videos/${encodeURIComponent(videoId)}/owner-play`,
        { method: "GET" },
      );
      if (!res.ok) throw new Error("Failed to fetch preview url");
      const json = (await res.json()) as { url: string };
      setPreviewUrl(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to preview");
    }
  }, []);

  const onOpenViewMode = useCallback(async (videoId: string) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/videos/${encodeURIComponent(videoId)}/owner-view-link`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to create view link");
      const json = (await res.json()) as { shareUrl: string };
      window.open(json.shareUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open view mode");
    }
  }, []);

  const formatMB = (bytes: number) => Math.max(1, Math.round(bytes / 1024 / 1024));

  if (initialVideos.length === 0) {
    return <p className="text-sm text-muted-foreground">No videos yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Create a share link</p>
          <p className="text-xs text-muted-foreground">
            Pick a video below, set an expiration time, then generate a secure link.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="datetime-local"
            value={expiresAtInput}
            onChange={(e) => setExpiresAtInput(e.target.value)}
            className="w-[240px]"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        {initialVideos.map((v) => {
          const isExpanded = expandedVideoId === v.id;
          const links = linksByVideo[v.id] ?? [];
          return (
            <div key={v.id} className="rounded-md border">
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{v.s3Key}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.contentType} • {formatMB(v.size)} MB •{" "}
                    {new Date(v.createdAt).toLocaleString()} • {v.linksCount} links
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void onExpandVideo(v.id)}
                  >
                    {isExpanded ? "Hide links" : "Manage links"}
                  </Button>
                  <Button variant="outline" onClick={() => void onPreview(v.id)}>
                    Play
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void onOpenViewMode(v.id)}
                  >
                    View mode
                  </Button>
                  <Button
                    onClick={() => void onCreateLink(v.id)}
                    disabled={busy}
                  >
                    Generate link
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t p-3 space-y-3">
                  {links.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No links yet for this video.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {links.map((l) => {
                        const shareUrl = `${shareOrigin}/v/${l.token}`;
                        const events = eventsByToken[l.token] ?? null;
                        return (
                          <div key={l.token} className="rounded-md border p-3 space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {shareUrl}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  status: {l.status}
                                  {l.lockedIp ? ` • lockedIp: ${l.lockedIp}` : ""} •
                                  expires: {new Date(l.expiresAt).toLocaleString()} •
                                  events: {l._count.events}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => void navigator.clipboard.writeText(shareUrl)}
                                >
                                  Copy
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => void loadEvents(l.token)}
                                >
                                  View logs
                                </Button>
                              </div>
                            </div>

                            {events && (
                              <div className="rounded-md border bg-muted/20 p-2">
                                <div className="space-y-1">
                                  {events.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No events.</p>
                                  ) : (
                                    events.map((ev) => (
                                      <div
                                        key={ev.id}
                                        className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                                      >
                                        <span>
                                          {new Date(ev.createdAt).toLocaleString()} • {ev.type}
                                          {ev.ip ? ` • ${ev.ip}` : ""}
                                        </span>
                                        {ev.userAgent && (
                                          <span className="truncate sm:max-w-[420px]">
                                            {ev.userAgent}
                                          </span>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {previewUrl && (
        <div className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Preview</p>
            <Button variant="outline" onClick={() => setPreviewUrl(null)}>
              Close
            </Button>
          </div>
          <video
            src={previewUrl}
            controls
            className="w-full max-h-[520px] bg-black rounded-md"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            playsInline
          />
        </div>
      )}
    </div>
  );
}

