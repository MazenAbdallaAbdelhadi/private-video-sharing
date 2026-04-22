"use client";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import {
  SUPPORTED_OAUTH_PROVIDERS,
  SUPPORTED_OAUTH_PROVIDERS_DETAILS,
} from "@/constants/o-auth-providers";

import { authClient } from "@/lib/auth/auth-client";

import { useReturnTo } from "@/features/auth/hooks";

export const Socials = () => {
  const returnTo = useReturnTo();
  const [isPending, transition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {SUPPORTED_OAUTH_PROVIDERS.map((provider) => {
        const providerDetails = SUPPORTED_OAUTH_PROVIDERS_DETAILS[provider];

        return (
          <Button
            key={provider}
            variant="outline"
            className="flex-1"
            disabled={isPending}
            onClick={() =>
              transition(async () => {
                await authClient.signIn.social({
                  provider,
                  callbackURL: returnTo,
                });
              })
            }
          >
            <providerDetails.Icon />
            {providerDetails.name}
          </Button>
        );
      })}
    </div>
  );
};
