import { Outlet, useNavigate } from '@tanstack/react-router';
import { Shell } from '@ataqu/ui';
import { getCinqActions } from './actions';

export function App() {
  const navigate = useNavigate();

  // Command palette search function: returns actions and also can search data
  const searchFn = async (query: string) => {
    // Return actions that match the query
    const actions = getCinqActions(navigate);
    // For now, just return actions; later we can also search contacts/deals
    return actions
      .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
      .map((a) => ({
        id: a.id,
        title: a.name,
        url: '', // not used for actions
        action: a.action,
      }));
  };

  return (
    <Shell activeApp="cinq" searchFn={searchFn}>
      <Outlet />
    </Shell>
  );
}
