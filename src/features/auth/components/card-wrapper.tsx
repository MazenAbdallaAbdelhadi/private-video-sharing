import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CardWrapperProps {
  headerLabel: string;
  headerCaption?: string;
  children: React.ReactNode;
}

export const CardWrapper = ({
  headerLabel,
  headerCaption,
  children,
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
    </Card>
  );
};
