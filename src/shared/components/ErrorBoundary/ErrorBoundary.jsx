import { Component } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

import ErrorScreen from "../ErrorScreen/ErrorScreen";
import { reportError } from "../../errorLogger";

class ErrorCatcher extends Component {
  state = { error: null, componentStack: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ componentStack: info.componentStack });
    reportError(error, { location: this.props.location, componentStack: info.componentStack });
  }

  retry = () => {
    this.props.onReset?.();
    this.setState({ error: null, componentStack: null });
  };

  render() {
    if (this.state.error && this.props.fallback !== undefined) {
      return this.props.fallback;
    }

    if (this.state.error) {
      return (
        <ErrorScreen
          error={this.state.error}
          location={this.props.location}
          componentStack={this.state.componentStack}
          onRetry={this.retry}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

export default function ErrorBoundary({ location, className, fallback, children }) {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorCatcher location={location} className={className} fallback={fallback} onReset={reset}>
      {children}
    </ErrorCatcher>
  );
}
