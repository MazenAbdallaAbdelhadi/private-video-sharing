import { useSearchParams } from "next/navigation";

import { DEFAULT_LOGIN_REDIRECT } from "@/constants/routes";

export function useReturnTo() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || DEFAULT_LOGIN_REDIRECT;

  return returnTo;
}
