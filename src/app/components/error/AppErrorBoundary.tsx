import { Component, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { GlassCard } from "../GlassCard";
import { Button } from "../ui/button";
import { logError } from "../../utils/logger";

type AppErrorBoundaryProps = {
  children: ReactNode;
  area?: string;
  className?: string;
  resetKeys?: readonly unknown[];
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

function arraysChanged(previous: readonly unknown[] = [], next: readonly unknown[] = []): boolean {
  if (previous.length !== next.length) {
    return true;
  }

  return previous.some((value, index) => !Object.is(value, next[index]));
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError("Unhandled UI error captured by boundary", {
      area: this.props.area ?? "application",
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.hasError && arraysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign("/");
  };

  private handleGoHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDevelopmentRuntime =
      import.meta.env.DEV &&
      typeof window !== "undefined" &&
      ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

    return (
      <div className={["max-w-3xl mx-auto px-4 py-16", this.props.className ?? ""].join(" ")}>
        <GlassCard className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">Something went wrong</h2>
          <p className="text-gray-700 mb-6">
            We hit an unexpected problem{this.props.area ? ` in this ${this.props.area}` : ""}. You can try again or continue to another page.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <Button
              type="button"
              onClick={this.handleRetry}
              className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            >
              Retry
            </Button>
            <Button type="button" variant="outline" className="bg-white/[0.45]" onClick={this.handleGoBack}>
              Go Back
            </Button>
            <Button type="button" variant="outline" className="bg-white/[0.45]" onClick={this.handleGoHome}>
              Go Home
            </Button>
          </div>

          {isDevelopmentRuntime && this.state.error ? (
            <pre className="text-left text-xs text-gray-700 bg-black/5 rounded-md p-3 overflow-auto">
              {this.state.error.stack || this.state.error.message}
            </pre>
          ) : null}
        </GlassCard>
      </div>
    );
  }
}

type BoundaryWrapOptions = {
  area?: string;
  className?: string;
};

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: BoundaryWrapOptions = {},
) {
  function WrappedWithBoundary(props: P) {
    return (
      <AppErrorBoundary area={options.area} className={options.className}>
        <WrappedComponent {...props} />
      </AppErrorBoundary>
    );
  }

  const componentName = WrappedComponent.displayName || WrappedComponent.name || "Component";
  WrappedWithBoundary.displayName = `withErrorBoundary(${componentName})`;

  return WrappedWithBoundary;
}
