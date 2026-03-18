"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — captura errores de render en React y muestra UI de fallback.
 * Usalo alrededor de secciones críticas de la app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[300px] flex items-center justify-center p-8">
          <div className="max-w-sm w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Algo salió mal
            </h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Ocurrió un error inesperado. Podés intentar recargar o volver al inbox.
            </p>
            {this.state.error && (
              <p className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-4 text-left truncate">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 rounded-xl hover:from-violet-700 hover:to-indigo-700 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reintentar
              </button>
              <a
                href="/inbox"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 bg-white px-4 py-2 rounded-xl hover:bg-slate-50 transition-all"
              >
                Volver al inbox
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
