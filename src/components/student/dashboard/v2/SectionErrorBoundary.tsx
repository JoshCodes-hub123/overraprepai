import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  name: string;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * SectionErrorBoundary — isolates a single dashboard section so one
 * crashing widget never blanks the whole page. Renders a calm, on-brand
 * fallback with a retry button that re-mounts the subtree.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(`[Dashboard:${this.props.name}]`, error);
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 text-center">
        <div className="mx-auto h-9 w-9 rounded-full bg-white border border-amber-200 flex items-center justify-center mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <p className="text-[12.5px] font-semibold text-neutral-800">
          {this.props.name} couldn't load
        </p>
        <p className="text-[11px] text-neutral-500 mt-0.5">
          The rest of your dashboard is fine.
        </p>
        <button
          onClick={this.reset}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-white px-3 py-1.5 text-[11.5px] font-semibold hover:bg-amber-600 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }
}

export default SectionErrorBoundary;
