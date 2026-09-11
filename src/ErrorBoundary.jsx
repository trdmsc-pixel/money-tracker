import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Ledger ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleClearAndReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.error('Error clearing caches:', e);
    }
    window.location.reload(true);
  };

  handleContinueAnyway = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#08090C',
            color: '#F4F6FB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: '420px',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '28px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                backgroundColor: '#F5C542',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '24px',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(245, 197, 66, 0.3)',
              }}
            >
              L
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#FFF' }}>
              Studio Ledger
            </h2>
            <p style={{ fontSize: '13px', color: '#7E8699', marginBottom: '20px', lineHeight: '1.5' }}>
              An issue occurred while loading this view. You can reload or reset the app cache.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 107, 138, 0.1)',
                  border: '1px solid rgba(255, 107, 138, 0.25)',
                  color: '#FF6B8A',
                  fontSize: '11px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  textAlign: 'left',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: '#F5C542',
                  color: '#000',
                  fontWeight: '700',
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Reload App
              </button>

              <button
                onClick={this.handleClearAndReload}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#F4F6FB',
                  fontWeight: '600',
                  fontSize: '13px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                }}
              >
                Clear Cache & Hard Reload
              </button>

              <button
                onClick={this.handleContinueAnyway}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7E8699',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '6px',
                  textDecoration: 'underline',
                }}
              >
                Dismiss & Try Continuing
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
