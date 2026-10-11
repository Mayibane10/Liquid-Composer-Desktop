import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppLayout } from './components/layout/AppLayout';
import { initPersistence } from './store/persistence';
import { $persistenceEnabled } from './store/uiStore';
import './styles/global.css';

const agentMode = new URLSearchParams(location.search).has('agent');
if (agentMode) $persistenceEnabled.set(false);
const restored = agentMode ? Promise.resolve() : initPersistence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppLayout />
  </StrictMode>
);

import('./agent/api').then(({ installAgentApi }) => installAgentApi(restored));
