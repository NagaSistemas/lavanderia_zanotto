import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { LaundryProvider } from './context/LaundryContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LaundryProvider>
        <App />
      </LaundryProvider>
    </AuthProvider>
  </StrictMode>,
);
