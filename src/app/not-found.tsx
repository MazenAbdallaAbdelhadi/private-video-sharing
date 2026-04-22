import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Empty className="max-w-md">
        <EmptyHeader>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>
            The page you’re looking for doesn’t exist.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}