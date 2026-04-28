"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VideoPicker } from "./video-picker";

type PageData = {
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  videos: Array<{
    id: string;
    videoId: string;
    sortOrder: number;
    video: {
      id: string;
      title: string | null;
      durationSeconds: number | null;
      thumbnailS3Key: string | null;
    };
  }>;
};

type VideoData = {
  id: string;
  title: string | null;
  durationSeconds: number | null;
  thumbnailS3Key: string | null;
};

export function PageBuilder({
  initialData,
  allVideos,
}: {
  initialData: PageData;
  allVideos: VideoData[];
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [pageVideos, setPageVideos] = useState(initialData.videos || []);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const updateField = (field: string, value: string | null) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/client-pages/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: data.clientName,
          clientEmail: data.clientEmail,
        }),
      });

      if (res.ok) {
        setSaveStatus("saved");
        router.refresh();
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm("Are you sure you want to delete this page? Links will break.")
    )
      return;
    setSaveStatus("saving");
    try {
      await fetch(`/api/client-pages/${data.id}`, { method: "DELETE" });
      router.push("/dashboard/pages");
    } finally {
      setSaveStatus("idle");
    }
  };

  return (
    <div className="h-full w-full bg-background">
      <div className="max-w-5xl mx-auto h-full flex flex-col">
        <div className="p-4 border-b bg-card/80 backdrop-blur-md flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/pages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>

          <Button
            variant={saveStatus === "error" ? "destructive" : "outline"}
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveStatus === "idle" && "Save"}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved ✓"}
            {saveStatus === "error" && "Error"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-3">
              Client Details
            </h2>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={data.clientName || ""}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  value={data.clientEmail || ""}
                  onChange={(e) => updateField("clientEmail", e.target.value)}
                  placeholder="e.g. contact@acme.com"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <VideoPicker
              pageId={data.id}
              allVideos={allVideos}
              pageVideos={pageVideos}
              onPageVideosChange={setPageVideos}
            />
          </section>

          <section className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Page
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
