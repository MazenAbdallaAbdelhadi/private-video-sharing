"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreatePageButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/client-pages", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) 
      });
      if (res.ok) {
        const page = await res.json();
        router.push(`/dashboard/pages/${page.id}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleCreate} disabled={isLoading}>
      <Plus className="mr-2 h-4 w-4" />
      {isLoading ? "Creating..." : "Create Page"}
    </Button>
  );
}
