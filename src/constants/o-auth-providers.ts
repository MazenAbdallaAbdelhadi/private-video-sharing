import { ComponentProps, ElementType } from "react";

import { DiscordIcon, GoogleIcon } from "@/components/auth/o-auth-icons";

export const SUPPORTED_OAUTH_PROVIDERS = ["google", "discord"] as const;
export type SupportedOAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

export const SUPPORTED_OAUTH_PROVIDERS_DETAILS: Record<
  SupportedOAuthProvider,
  { name: string; Icon: ElementType<ComponentProps<"svg">> }
> = {
  google: {
    name: "Google",
    Icon: GoogleIcon,
  },
  discord: {
    name: "Discord",
    Icon: DiscordIcon,
  },
};
