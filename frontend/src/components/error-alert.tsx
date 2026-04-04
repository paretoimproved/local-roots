export function ErrorAlert({
  error,
  onRetry,
  className,
}: {
  error: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={`rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200${className ? ` ${className}` : ""}`}>
      <p>{error}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-2 text-sm font-medium underline"
          onClick={onRetry}
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
