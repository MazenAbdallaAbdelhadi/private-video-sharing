import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { LinkIcon } from "lucide-react";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { CreateLinkDialog } from "@/features/dashboard/links/create-link-dialog";
import { LinksTable } from "@/features/dashboard/links/links-table";

export default async function LinksPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const links = await prisma.clientLink.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      clientPage: { select: { id: true, clientName: true, heroTitle: true } },
      _count: { select: { events: true } },
    },
  });

  const pages = await prisma.clientPage.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, clientName: true, heroTitle: true },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Generated Links</h1>
          <p className="text-muted-foreground">
            Manage secure access links to your client pages.
          </p>
        </div>
        <CreateLinkDialog pages={pages} />
      </div>

      {links.length === 0 ? (
        <div className="text-center p-12 border rounded-lg bg-card text-muted-foreground border-dashed flex flex-col items-center gap-4">
          <LinkIcon size={48} className="opacity-20" />
          <p>You haven't generated any secure links yet.</p>
          <CreateLinkDialog pages={pages} />
        </div>
      ) : (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <LinksTable links={links} />
        </div>
      )}
    </div>
  );
}
