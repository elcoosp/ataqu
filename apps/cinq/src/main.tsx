import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import './index.css';
import { I18nProvider } from '@ataqu/shared-i18n';

// Import the actions registration
import { getCinqActions } from './actions';

// For now, we'll register actions via a global registry if available.
// The CommandPalette component in @ataqu/ui accepts a searchFn prop.
// We'll pass a search function that returns actions.
// For now, we'll just build the router.

const router = createRouter({ routeTree });

// @ts-ignore – we'll handle this via the Shell's searchFn
window.__CINQ_ACTIONS = getCinqActions;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>
);
