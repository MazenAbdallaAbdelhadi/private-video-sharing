import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Plus, LayoutTemplate, MoreVertical } from "lucide-react";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";
import { CreatePageButton } from "@/features/dashboard/page-builder/create-page-button";

export default async function ClientPagesListPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const pages = await prisma.clientPage.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { videos: true, links: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Client Pages</h1>
          <p className="text-muted-foreground">
            Build and manage secure landing pages for your clients.
          </p>
        </div>
        <CreatePageButton />
      </div>

      {pages.length === 0 ? (
        <div className="text-center p-12 border rounded-lg bg-card text-muted-foreground border-dashed flex flex-col items-center gap-4">
          <LayoutTemplate size={48} className="opacity-20" />
          <p>You haven't created any client pages yet.</p>
          <CreatePageButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page) => (
            <div key={page.id} className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col hover:border-violet-500/50 transition-colors">
              <div className="p-5 flex flex-col flex-1 gap-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg line-clamp-1 leading-none">
                      {page.clientName || "Unnamed Client"}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {page.heroTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm mt-auto border-t pt-4">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">Status</span>
                    <span className={page.isPublished ? "text-green-600 dark:text-green-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                      {page.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div className="flex flex-col border-l pl-4">
                    <span className="text-muted-foreground text-xs">Videos</span>
                    <span className="font-medium">{page._count.videos}</span>
                  </div>
                  <div className="flex flex-col border-l pl-4">
                    <span className="text-muted-foreground text-xs">Links</span>
                    <span className="font-medium">{page._count.links}</span>
                  </div>
                </div>

                <Button asChild className="w-full mt-2" variant="secondary">
                  <Link href={`/dashboard/pages/${page.id}`}>
                    Edit Page
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
