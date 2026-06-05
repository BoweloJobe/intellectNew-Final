import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/ui/button";

type ErrorDetails = {
  title: string;
  message: string;
  technical: string | null;
};

function getErrorDetails(error: unknown): ErrorDetails {
  if (isRouteErrorResponse(error)) {
    const statusText = error.statusText || "Request Failed";
    const message =
      typeof error.data === "string"
        ? error.data
        : "We could not load this page right now. Please try again.";

    return {
      title: `Something went wrong (${error.status})`,
      message,
      technical: `${error.status} ${statusText}`,
    };
  }

  if (error instanceof Error) {
    return {
      title: "Unexpected Application Error",
      message: "We hit a problem while loading this page.",
      technical: error.stack || error.message,
    };
  }

  return {
    title: "Unexpected Application Error",
    message: "We hit a problem while loading this page.",
    technical: null,
  };
}

export function RouteErrorPage() {
  const error = useRouteError();
  const { title, message, technical } = getErrorDetails(error);
  const isDevelopmentRuntime =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <GlassCard className="text-center">
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">{title}</h1>
        <p className="text-gray-700 mb-6">{message}</p>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Link to="/">
            <Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white">Go Home</Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="bg-white/[0.45]">
              Go to Login
            </Button>
          </Link>
        </div>

        {isDevelopmentRuntime && technical ? (
          <pre className="text-left text-xs text-gray-700 bg-black/5 rounded-md p-3 overflow-auto">
            {technical}
          </pre>
        ) : null}
      </GlassCard>
    </div>
  );
}
