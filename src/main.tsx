import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { OverlayScrollbars } from 'overlayscrollbars';
import App from './App.tsx';
import './index.css';

OverlayScrollbars(
  { target: document.body },
  { scrollbars: { autoHide: 'never', theme: 'os-theme-dark' } }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
