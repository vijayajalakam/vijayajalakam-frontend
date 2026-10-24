import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/admin/dashboard";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white transition-colors">
          <div className="max-w-md w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                An unexpected error occurred while rendering this screen.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-gray-100 dark:bg-dark-surface rounded-xl text-left font-mono text-xs text-red-600 dark:text-red-400 overflow-x-auto max-h-32 border border-gray-200 dark:border-dark-border">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-brand-primary text-white font-bold text-sm shadow hover:bg-brand-secondary active:scale-[0.98] transition-all"
              >
                <RefreshCw size={16} />
                <span>Reload Screen</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-dark-hover active:scale-[0.98] transition-all"
              >
                <Home size={16} />
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
