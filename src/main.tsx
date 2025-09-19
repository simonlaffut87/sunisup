import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

// Add error boundary to catch any rendering errors
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('App rendering error:', error);
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
        <p>L'application se charge...</p>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
          Si cette page persiste, veuillez rafraîchir votre navigateur.
        </p>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
} else {
  console.error('Root element not found');
}