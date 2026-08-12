import { useEffect } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { Shell } from '@ataqu/ui';
import { registerCinqActions } from './actions';

export function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Register actions when the app mounts
    registerCinqActions(navigate);
  }, [navigate]);

  // Provide a search function for the command palette (optional)
  const searchFn = async (q: string) => {
    // Placeholder: we could search contacts, deals, etc.
    return [];
  };

  return (
    <Shell activeApp="cinq" searchFn={searchFn}>
      <Outlet />
    </Shell>
  );
}
