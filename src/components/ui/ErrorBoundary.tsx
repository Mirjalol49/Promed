import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // 🔥 AUTO-FIX: specific handling for "Failed to fetch dynamically imported module"
        // This happens when a new version is deployed and the user's browser tries to fetch old chunks.
        if (error.message.includes("Failed to fetch dynamically imported module") ||
            error.message.includes("Importing a module script failed")) {
            console.warn("💎 Version mismatch detected. Auto-reloading...");
            window.location.reload();
            return;
        }

        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-200 m-4">
                    <div className="p-4 bg-red-100/50 text-red-600 rounded-full mb-4 ring-4 ring-red-50">
                        <AlertCircle size={48} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h2>
                    <p className="text-slate-500 font-medium max-w-md mb-6">
                        The application encountered an unexpected error.
                    </p>

                    <div className="w-full max-w-lg bg-slate-900 text-slate-200 p-4 rounded-xl text-left font-mono text-xs overflow-auto mb-6 shadow-inner border border-slate-800">
                        <p className="text-red-400 font-bold mb-2">{this.state.error?.toString()}</p>
                        <pre className="opacity-70 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/20"
                    >
                        <RefreshCw size={18} />
                        <span>Reload Application</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
