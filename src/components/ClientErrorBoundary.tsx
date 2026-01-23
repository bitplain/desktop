"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { reportClientError } from "./ClientErrorReporter";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ClientErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportClientError({
      type: "error",
      message: error.message || "React error boundary",
      stack: error.stack,
      source: info.componentStack || undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="stack">
          <h2>Application error: a client-side exception has occurred while loading.</h2>
          <p>Check the browser console for more information.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
