import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './providers/ToastProvider';
import { CelebrationProvider } from './components/ui/CelebrationSystem';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <CelebrationProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </CelebrationProvider>
    </ToastProvider>
  </React.StrictMode>
);

