import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    void error;
    void info;
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, message: "" });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 border border-rose-900/60 bg-rose-950/40 p-6 text-center">
          <p className="text-sm font-medium text-rose-200">
            {this.props.title} crashed
          </p>
          <p className="max-w-sm text-xs text-rose-100/80">{this.state.message}</p>
          <button
            type="button"
            onClick={this.handleReset}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
