"use client";
import { Input } from "@/components/ui/input";
import { CardWrapper } from "../card-wrapper";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { addUser } from "../../actions/add-user";

export const LoginView = () => {
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await authClient.signIn.email(
        {
          email,
          password,
          callbackURL: "/dashboard",
        },
        {
          onError: (error) => {
            toast.error(
              error.error.message ||
                "An unexpected error occurred during login.",
            );
          },
        },
      );
    } catch (error: unknown) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="h-svh flex flex-col items-center justify-center p-4">
      <CardWrapper
        headerLabel="Welcome Back 👋"
        headerCaption="Happy to see you again"
      >
        <form onSubmit={onSubmit} className="flex w-full flex-col gap-6">
          <Input name="email" type="email" placeholder="Email" />
          <Input name="password" type="password" placeholder="Password" />
          <Button size={"lg"} type="submit" className="w-full">
            Sign In
          </Button>
        </form>

        <Button onClick={addUser} variant="outline" className="mt-4 w-full">
          add user
        </Button>
      </CardWrapper>
    </div>
  );
};
