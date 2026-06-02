import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SidePanel } from './SidePanel';
import '@/styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('ReadAloud side panel: #root not found');

createRoot(root).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
);
