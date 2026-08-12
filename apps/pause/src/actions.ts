export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

export const usePauseCommandActions = () => {
  const actions: CommandAction[] = [
    {
      id: 'add-employee',
      label: 'Add Employee',
      run: () => window.location.assign('/directory'),
    },
    {
      id: 'go-directory',
      label: 'Go to Directory',
      run: () => window.location.assign('/directory'),
    },
    {
      id: 'go-leave',
      label: 'Go to Leave',
      run: () => window.location.assign('/leave'),
    },
    {
      id: 'go-onboarding',
      label: 'Go to Onboarding',
      run: () => window.location.assign('/onboarding'),
    },
    {
      id: 'go-reports',
      label: 'Go to Reports',
      run: () => window.location.assign('/reports'),
    },
  ];

  return actions;
};
