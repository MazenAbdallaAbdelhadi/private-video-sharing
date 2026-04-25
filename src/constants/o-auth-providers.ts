import { ComponentProps, ElementType } from "react";

import { DiscordIcon, GoogleIcon } from "@/components/auth/o-auth-icons";

export const SUPPORTED_OAUTH_PROVIDERS = ["discord"] as const;
export type SupportedOAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

export const SUPPORTED_OAUTH_PROVIDERS_DETAILS: Record<
  SupportedOAuthProvider,
  { name: string; Icon: ElementType<ComponentProps<"svg">> }
> = {
  discord: {
    name: "Discord",
    Icon: DiscordIcon,
  },
};
