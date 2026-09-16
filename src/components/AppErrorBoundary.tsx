import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null; componentStack: string };

/**
 * Root error boundary. Catches render-phase crashes and shows the exact error
 * on screen so startup failures can be diagnosed without remote debugging.
 * Does not change any visual design when the app runs normally.
 */
export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Classtago] App crash:', error, info);
    try {
      localStorage.setItem('edunixo.lastCrash', JSON.stringify({
        message: error.message,
        stack: (error.stack || '').slice(0, 2000),
        componentStack: (info.componentStack || '').slice(0, 2000),
        at: new Date().toISOString(),
      }));
    } catch {}
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('edunixo.lastCrash');
      localStorage.removeItem('edunixo.app.recentSchool');
      localStorage.removeItem('edunixo.mobile.recentSchool');
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', padding: 24, background: '#F7F9FF', color: '#0F172A',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>App Error</h1>
        <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
          Kuch galat ho gaya. Screenshot lein aur share karein.
        </p>
        <pre style={{
          background: '#fff', padding: 12, borderRadius: 8, fontSize: 11,
          overflow: 'auto', maxHeight: 360, border: '1px solid #E2E8F0',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {this.state.error.message}
          {'\n\n'}
          {(this.state.error.stack || '').slice(0, 1500)}
        </pre>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={this.handleReset} style={{
            padding: '10px 16px', background: '#0F172A', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 600,
          }}>Reset & Reload</button>
        </div>
      </div>
    );
  }
}
