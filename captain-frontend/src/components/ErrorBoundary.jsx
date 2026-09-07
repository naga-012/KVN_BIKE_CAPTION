import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.removeItem('kvn_captain_profile');
      localStorage.setItem('kvn_captain_code', 'cpt_a');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark-900 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-dark-800 border-2 border-brand-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-brand-400 flex items-center justify-center mx-auto border border-amber-500/40">
              <AlertTriangle className="w-8 h-8 text-brand-400" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-white">KVN Captain Partner</h2>
              <p className="text-xs text-slate-400">
                Application encountered an unexpected error while initializing.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-dark-900 p-3 rounded-xl border border-dark-600 text-left text-[11px] font-mono text-rose-400 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-dark-900 font-black text-xs uppercase tracking-wider shadow-glow-gold hover:from-brand-400 hover:to-brand-500 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset & Reload App</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-300 font-bold text-xs transition-all border border-dark-600 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Refresh Page</span>
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
