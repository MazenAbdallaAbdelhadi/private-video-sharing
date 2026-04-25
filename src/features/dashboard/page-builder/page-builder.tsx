"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { VideoPicker } from "./video-picker";

type PageData = any; // simplified for implementation plan execution
type VideoData = any;

export function PageBuilder({ 
  initialData, 
  allVideos 
}: { 
  initialData: PageData; 
  allVideos: VideoData[];
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const updateField = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/client-pages/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle,
          aboutText: data.aboutText,
          accentColor: data.accentColor,
          showEditorName: data.showEditorName,
          isPublished: data.isPublished,
        }),
      });
      if (res.ok) {
        setSaveStatus('saved');
        router.refresh();
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this page? Links will break.")) return;
    setSaveStatus('saving');
    try {
      await fetch(`/api/client-pages/${data.id}`, { method: "DELETE" });
      router.push("/dashboard/pages");
    } finally {
      setSaveStatus('idle');
    }
  };

  return (
    <div className="flex h-full w-full bg-background">
      {/* Left Panel: Editor */}
      <div className="w-[400px] border-r flex flex-col bg-card overflow-hidden shrink-0">
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/pages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button 
              variant={saveStatus === 'error' ? "destructive" : "outline"} 
              size="sm" 
              onClick={handleSave} 
              disabled={saveStatus === 'saving'}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveStatus === 'idle' && "Save"}
              {saveStatus === 'saving' && "Saving..."}
              {saveStatus === 'saved' && "Saved ✓"}
              {saveStatus === 'error' && "Error"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Client Details</h3>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input 
                value={data.clientName || ""} 
                onChange={(e) => updateField("clientName", e.target.value)} 
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label>Client Email (for Watermark)</Label>
              <Input 
                value={data.clientEmail || ""} 
                onChange={(e) => updateField("clientEmail", e.target.value)} 
                placeholder="e.g. contact@acme.com"
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Hero Section</h3>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={data.heroTitle} 
                onChange={(e) => updateField("heroTitle", e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea 
                value={data.heroSubtitle || ""} 
                onChange={(e) => updateField("heroSubtitle", e.target.value)} 
                rows={3}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-semibold border-b pb-2">About Section</h3>
            <div className="space-y-2">
              <Label>Text</Label>
              <Textarea 
                value={data.aboutText || ""} 
                onChange={(e) => updateField("aboutText", e.target.value)} 
                rows={5}
                placeholder="Optional description or context about the videos."
              />
            </div>
          </section>

          <section className="space-y-4">
            <VideoPicker 
              pageId={data.id} 
              allVideos={allVideos} 
              pageVideos={data.videos || []} 
            />
          </section>

          <section className="space-y-4">
            <h3 className="font-semibold border-b pb-2">Branding</h3>
            <div className="space-y-2">
              <Label>Accent Color</Label>
              <div className="flex items-center gap-3">
                <Input 
                  type="color" 
                  value={data.accentColor} 
                  onChange={(e) => updateField("accentColor", e.target.value)} 
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <span className="font-mono text-sm">{data.accentColor}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Show your editor name</Label>
              <Switch 
                checked={data.showEditorName} 
                onCheckedChange={(c) => updateField("showEditorName", c)} 
              />
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Publish Page</Label>
                <p className="text-xs text-muted-foreground">Make it accessible via links.</p>
              </div>
              <Switch 
                checked={data.isPublished} 
                onCheckedChange={(c) => updateField("isPublished", c)} 
              />
            </div>
            
            <Button variant="destructive" className="w-full mt-4" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Page
            </Button>
          </section>
        </div>
      </div>

      {/* Right Panel: Placeholder for iframe preview or basic visualizer */}
      <div className="flex-1 bg-muted/50 p-8 flex flex-col items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
          <Eye className="w-64 h-64" />
        </div>
        <div className="w-full max-w-4xl h-full bg-black rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col items-center justify-center text-white relative z-10">
          {/* Extremely simplified preview of the page settings */}
          <div className="text-center p-12 w-full">
             <h1 className="text-4xl font-medium mb-4" style={{ color: data.accentColor }}>{data.heroTitle}</h1>
             <p className="text-white/60 text-lg mb-12">{data.heroSubtitle || "Add a subtitle..."}</p>
             <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto opacity-50">
               <div className="aspect-video bg-white/5 rounded-lg border border-white/10"></div>
               <div className="aspect-video bg-white/5 rounded-lg border border-white/10"></div>
               <div className="aspect-video bg-white/5 rounded-lg border border-white/10"></div>
             </div>
             <p className="mt-12 text-sm text-white/30 uppercase tracking-widest font-mono">Live Preview Render Placeholder</p>
          </div>
        </div>
      </div>
    </div>
  );
}
