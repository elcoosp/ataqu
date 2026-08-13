import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
declare module "@tanstack/react-router" { interface Register { router: typeof router; } }
import { routeTree } from './routeTree.gen';
import './index.css';
import { I18nProvider } from '@ataqu/shared-i18n';

const router = createRouter({ routeTree });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>
  </React.StrictMode>
);
