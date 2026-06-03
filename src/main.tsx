import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App.tsx';
import './index.css';

function ErrorFallback({error, resetErrorBoundary}: {error: Error, resetErrorBoundary: () => void}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h1 className="text-xl font-black text-gray-900 mb-2">Oups ! Quelque chose s'est mal passé.</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-6 py-3 bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/30 active:scale-95 transition-all"
      >
        Réessayer
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
