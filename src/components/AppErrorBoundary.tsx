import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AllCanCode render error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-fallback">
          <div>
            <strong>页面加载异常</strong>
            <span>请刷新页面后重试。如果问题仍然存在，请清除浏览器缓存。</span>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
