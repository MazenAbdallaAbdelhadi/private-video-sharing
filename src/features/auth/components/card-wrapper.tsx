import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Socials } from "./socials";

interface CardWrapperProps {
  headerLabel: string;
  headerCaption?: string;
  children: React.ReactNode;
  showSocial?: boolean;
  backButtonLabel?: string;
  backButtonHref?: string;
}

export const CardWrapper = ({
  headerLabel,
  headerCaption,
  children,
  showSocial = false,
  backButtonHref,
  backButtonLabel,
}: CardWrapperProps) => {
  return (
    <Card className="max-w-md min-w-xs sm:min-w-md border-0 bg-background shadow-none">
      <CardHeader className="text-center mb-4">
        <CardTitle className="text-3xl font-semibold">{headerLabel}</CardTitle>
        {headerCaption && (
          <CardDescription className="text-sm text-muted-foreground">
            {headerCaption}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent>{children}</CardContent>

      <CardFooter className="flex-col">
        {showSocial && (
          <div className="my-4 w-full">
            <Socials />
          </div>
        )}
        {backButtonHref && backButtonLabel && (
          <Button variant="link" asChild size="sm" className="text-center w-full">
            <Link href={backButtonHref}>
              {backButtonLabel}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
