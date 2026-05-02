"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { Video, FileVideo, Link as LinkIcon, BarChart } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { UserSidebarButton } from "../auth";

const navItems = [
  {
    title: "Videos",
    url: "/dashboard/videos",
    icon: Video,
  },
  {
    title: "Client Pages",
    url: "/dashboard/pages",
    icon: FileVideo,
  },
  {
    title: "Links",
    url: "/dashboard/links",
    icon: LinkIcon,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-white/5 bg-black/40 backdrop-blur-xl">
      <SidebarHeader className="p-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image 
            src="/dashboard-logo.png" 
            alt="PeraPixel" 
            width={120} 
            height={30} 
            className="h-10 w-full object-cover"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-white/40 uppercase tracking-widest text-[10px]">Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.url)}
                    className="data-[active=true]:bg-blue-600/10 data-[active=true]:text-blue-400"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5">
        <UserSidebarButton />
      </SidebarFooter>
    </Sidebar>
  );
}

