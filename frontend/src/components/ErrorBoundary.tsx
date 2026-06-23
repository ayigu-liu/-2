import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-950 text-white flex items-center justify-center p-8">
          <div className="glass-strong rounded-2xl p-8 text-center max-w-md border border-red-500/20">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">页面出错了</h2>
            <p className="text-sm text-emerald-300/70 mb-6 font-mono break-all">
              {this.state.error?.message || "未知错误"}
            </p>
            <button
              onClick={this.handleRetry}
              className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-400 px-6 py-2.5 text-sm font-bold text-emerald-900 hover:from-yellow-400 hover:to-yellow-300 transition-all active:scale-95"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
