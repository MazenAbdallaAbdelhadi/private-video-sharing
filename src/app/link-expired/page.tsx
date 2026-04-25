export default function LinkExpiredPage() {
  return (
    <div className="min-h-svh flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Link expired</h1>
        <p className="text-muted-foreground">
          This link is no longer valid. It may have expired or been revoked due to a
          viewing rule violation.
        </p>
      </div>
    </div>
  );
}

