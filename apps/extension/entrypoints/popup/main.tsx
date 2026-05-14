import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { injectTokens } from '@/lib/tokens';
import { App } from './App';

injectTokens();

const container = document.getElementById('root');
if (!container) throw new Error('popup: #root not found');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
