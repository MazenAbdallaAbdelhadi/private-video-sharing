import { CardWrapper } from "../card-wrapper";

export const LoginView = () => {
  return (
    <div className="h-svh flex flex-col items-center justify-center p-4">
      <CardWrapper
        headerLabel="Welcome Back 👋"
        headerCaption="Happy to see you again"
        showSocial
      >
        <p className="text-muted-foreground text-center">Continue with your social account</p>
      </CardWrapper>
    </div>
  );
};
