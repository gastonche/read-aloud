import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import '@/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('ReadAloud popup: #root not found');

createRoot(root).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
