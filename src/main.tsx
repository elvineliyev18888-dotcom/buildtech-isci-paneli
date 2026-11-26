import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WorkerApp from './WorkerApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkerApp />
  </StrictMode>,
);
