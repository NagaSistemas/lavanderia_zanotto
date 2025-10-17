import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LaundryProvider } from './context/LaundryContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LaundryProvider>
      <App />
    </LaundryProvider>
  </StrictMode>,
);
