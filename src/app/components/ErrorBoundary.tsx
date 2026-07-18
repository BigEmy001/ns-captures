import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";

export function ErrorBoundary() {
  const error = useRouteError();
  console.error("ErrorBoundary caught an error:", error);

  let errorMessage = "An unexpected error occurred.";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.data?.message || error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    
    // Auto-reload on stale Vite chunks
    if (
      errorMessage.includes("Failed to fetch dynamically imported module") ||
      errorMessage.includes("Importing a module script failed")
    ) {
      window.location.reload();
      return <div className="p-10 text-center font-mono text-sm">Reloading application...</div>;
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-5 py-20 text-center">
      <div className="mb-8 rounded-full bg-red-50/80 p-4 text-red-500 shadow-sm ring-1 ring-red-100">
        <AlertCircle className="size-10" />
      </div>
      <h1 className="font-serif text-4xl text-[#18211f]">
        {errorStatus === 404 ? "Page Not Found" : "Something went wrong"}
      </h1>
      <p className="mt-4 max-w-md text-sm text-[#6b716d]">
        {errorStatus === 404 
          ? "The page you're looking for doesn't exist or has been moved." 
          : "We encountered an unexpected error while trying to process your request."}
      </p>
      
      {/* Error Details */}
      {errorMessage && (
        <div className="mt-6 w-full max-w-lg rounded-xl border border-red-100 bg-red-50/30 p-4 text-left">
          <p className="font-mono text-xs font-semibold text-red-800">ERROR DETAILS:</p>
          <p className="mt-2 font-mono text-xs text-red-600 break-words">{errorMessage}</p>
        </div>
      )}

      <div className="mt-10 flex gap-4">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-full bg-[#1e4a3f] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14362d] shadow-md hover:shadow-lg"
        >
          <RefreshCcw className="size-4" /> Try again
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full border border-[#ececec] bg-white px-6 py-3 text-sm font-semibold text-[#18211f] transition hover:border-[#1e4a3f] shadow-sm hover:shadow-md"
        >
          <Home className="size-4" /> Go home
        </Link>
      </div>
    </div>
  );
}
