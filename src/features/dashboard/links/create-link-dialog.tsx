"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Link as LinkIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PageSummary = { id: string; clientName: string | null; heroTitle: string };

export function CreateLinkDialog({ pages }: { pages: PageSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [clientPageId, setClientPageId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!clientPageId) return alert("Select a page");
    setIsLoading(true);
    try {
      const res = await fetch("/api/client-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientPageId,
          expiresInDays,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
        }),
      });
      if (res.ok) {
        const link = await res.json();
        setCreatedUrl(`${window.location.origin}/c/${link.token}`);
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to generate link");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setCreatedUrl(null);
    setClientPageId("");
    setExpiresInDays(7);
    setClientName("");
    setClientEmail("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) reset(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Generate Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Secure Link</DialogTitle>
        </DialogHeader>

        {createdUrl ? (
          <div className="py-6 flex flex-col gap-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <LinkIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">Link successfully generated!</p>
            <div className="p-3 bg-muted rounded font-mono text-xs break-all border select-all">
              {createdUrl}
            </div>
            <Button onClick={() => navigator.clipboard.writeText(createdUrl)}>
              Copy to Clipboard
            </Button>
            <Button variant="outline" onClick={reset}>
              Done
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label>Select Client Page</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={clientPageId}
                onChange={(e) => setClientPageId(e.target.value)}
              >
                <option value="" disabled>Select a page...</option>
                {pages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.clientName || p.heroTitle}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Expires in (days)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="90" 
                  value={expiresInDays} 
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))} 
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Optional Watermark Overrides</p>
              <div className="grid gap-2">
                <Label>Recipient Name</Label>
                <Input 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label>Recipient Email</Label>
                <Input 
                  value={clientEmail} 
                  onChange={(e) => setClientEmail(e.target.value)} 
                  placeholder="e.g. john@example.com"
                />
              </div>
            </div>
          </div>
        )}

        {!createdUrl && (
          <DialogFooter>
            <Button variant="outline" onClick={reset} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading || !clientPageId}>
              {isLoading ? "Generating..." : "Generate Link"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
