"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/auth-client";

interface LogoutButtonProps {
  children: React.ReactNode;
}

export const LogoutButton = ({ children }: LogoutButtonProps) => {
  const router = useRouter();
  async function handleLogout() {
    await authClient.signOut(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  }

  return <span onClick={handleLogout}>{children}</span>;
};
