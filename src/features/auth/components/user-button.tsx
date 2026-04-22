"use client";
import Link from "next/link";
import {
  BadgeCheckIcon,
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  SparkleIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { useIsMobile } from "@/hooks/use-mobile";

import { authClient } from "@/lib/auth/auth-client";

import { LogoutButton } from "./logout-button";

export const UserButton = () => {
  const { data: session, isPending } = authClient.useSession();

  const isMobile = useIsMobile();

  const menuData = [
    {
      label: "Profile",
      icon: BadgeCheckIcon,
      href: "/settings/profile",
    },
    {
      label: "Notifications",
      icon: BellIcon,
      href: "/notifications",
    },
  ];

  if (isPending) return <Skeleton className="size-9 rounded-lg" />;

  if (!session) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg">
          <AvatarFallback className="rounded-lg">
            {session.user.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
          <AvatarImage src={session.user.image || ""} alt={session.user.name} />
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        {/* USER LABEL */}
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={session.user.image || ""}
                alt={session.user.name}
              />
              <AvatarFallback className="rounded-lg">
                {session.user.name.slice(0, 2).toLocaleUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{session.user.name}</span>
              <span className="truncate text-xs">{session.user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem>
            <SparkleIcon />
            Upgrade to Pro
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* NAVIGATION MENU */}
        <DropdownMenuGroup>
          {menuData.map((item) => (
            <DropdownMenuItem asChild key={item.label}>
              <Link href={item.href}>
                <item.icon />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* LOGOUT BUTTON */}
        <DropdownMenuItem variant="destructive">
          <LogoutButton>
            <div className="flex items-center gap-2">
              <LogOutIcon className="text-destructive" />
              Log out
            </div>
          </LogoutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
