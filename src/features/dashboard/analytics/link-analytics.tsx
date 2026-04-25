"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { VideoEngagementChart } from "./video-engagement-chart";
import { ActivityTimeline } from "./activity-timeline";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LinkSummary = {
  token: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPage: { clientName: string | null; heroTitle: string };
};

export function LinkAnalytics({ initialLinks }: { initialLinks: LinkSummary[] }) {
  const [selectedToken, setSelectedToken] = useState<string>(initialLinks[0]?.token || "");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedToken) return;
    setIsLoading(true);
    fetch(`/api/client-links/${selectedToken}/analytics`)
      .then(res => res.json())
      .then(json => setData(json))
      .finally(() => setIsLoading(false));
  }, [selectedToken]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <label className="text-sm font-medium whitespace-nowrap">Select Link to Analyze:</label>
        <Select value={selectedToken} onValueChange={setSelectedToken}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a link" />
          </SelectTrigger>
          <SelectContent>
            {initialLinks.map(link => (
              <SelectItem key={link.token} value={link.token}>
                {link.clientName || link.clientPage.clientName || link.clientPage.heroTitle} ({link.token.substring(0,6)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-lg border shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Video Engagement</h2>
              <VideoEngagementChart videos={data.videos} engagement={data.engagement} />
            </div>
            
            <div className="bg-card rounded-lg border shadow-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
               <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{data.link.status}</p>
               </div>
               <div>
                  <p className="text-sm text-muted-foreground">IP Lock</p>
                  <p className="font-mono text-sm">{data.link.lockedIp || "Pending"}</p>
               </div>
               <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="font-semibold">{data.events.length}</p>
               </div>
            </div>
          </div>
          
          <div className="bg-card rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
            <ActivityTimeline events={data.events} videos={data.videos} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
