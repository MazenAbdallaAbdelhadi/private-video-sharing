"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, Copy, Ban, Trash2 } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LinkData = {
  token: string;
  expiresAt: Date;
  status: string;
  clientName: string | null;
  clientEmail: string | null;
  lockedIp: string | null;
  clientPage: { id: string; clientName: string | null; heroTitle: string };
  _count: { events: number };
};

export function LinksTable({ links }: { links: LinkData[] }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/c/${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRevoke = async (token: string) => {
    if (!confirm("Revoke this link? Viewers will immediately lose access.")) return;
    setIsLoading(token);
    try {
      const res = await fetch(`/api/client-links/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to revoke link");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke link");
    } finally {
      setIsLoading(null);
    }
  };

  const handleDelete = async (token: string) => {
    if (!confirm("Permanently delete this link and its analytics?")) return;
    setIsLoading(token);
    try {
      const res = await fetch(`/api/client-links/${token}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Failed to delete link");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete link");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md flex justify-between items-center">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-auto p-1">Close</Button>
        </div>
      )}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Page</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>IP Lock</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => {
            const isExpired = new Date() > new Date(link.expiresAt);
            const status = link.status === "revoked" ? "Revoked" : isExpired ? "Expired" : "Active";
            
            return (
              <TableRow key={link.token} className={isLoading === link.token ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{link.clientName || "Anonymous"}</span>
                    {link.clientEmail && <span className="text-xs text-muted-foreground">{link.clientEmail}</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{link.clientPage.clientName || link.clientPage.heroTitle}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={status === "Active" ? "default" : status === "Revoked" ? "destructive" : "secondary"}>
                    {status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {link.lockedIp ? (
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{link.lockedIp}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm whitespace-nowrap">
                    {formatDistanceToNow(new Date(link.expiresAt), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => copyToClipboard(link.token)}>
                        <Copy className="h-4 w-4 mr-2" /> 
                        {copiedToken === link.token ? "Copied!" : "Copy URL"}
                      </DropdownMenuItem>
                      {status === "Active" && (
                        <DropdownMenuItem onClick={() => handleRevoke(link.token)} className="text-amber-600 focus:text-amber-600">
                          <Ban className="h-4 w-4 mr-2" /> Revoke Access
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(link.token)} className="text-red-600 focus:text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
