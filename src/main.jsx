import React from 'react';
import ReactDOM from 'react-dom/client';
import Ledger from './Ledger';
import ErrorBoundary from './ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Ledger />
    </ErrorBoundary>
  </React.StrictMode>
);
