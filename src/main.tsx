import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          backgroundColor: '#ffffff',
          color: '#000000',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h1 style={{ color: '#F59E0B', marginBottom: '20px' }}>Sun Is Up</h1>
          <p>Une erreur s'est produite lors du chargement de l'application.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#F59E0B',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </HelmetProvider>
    </StrictMode>
  );
} else {
  console.error('Root element not found');
  // Fallback if root element is missing
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; background: white; color: black; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
      <h1 style="color: #F59E0B; margin-bottom: 20px;">Sun Is Up</h1>
      <p>Erreur de chargement de l'application.</p>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #F59E0B; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Recharger
      </button>
    </div>
  `;
}