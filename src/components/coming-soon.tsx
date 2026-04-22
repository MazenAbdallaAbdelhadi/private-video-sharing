import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"

export function ComingSoon({ title = "Coming soon" }) {
  return (
    <div className="flex items-center justify-center py-20">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>
            This feature is under construction.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}