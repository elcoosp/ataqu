export interface SondAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  context?: string;
}

export const sondActions: SondAction[] = [
  { id: 'sond:create-form', label: 'Create Form', icon: 'plus', shortcut: 'mod+n' },
  { id: 'sond:go-to-forms', label: 'Go to Forms', icon: 'layout-grid' },
  { id: 'sond:go-to-submissions', label: 'Go to Submissions', icon: 'inbox' },
  { id: 'sond:search-forms', label: 'Search Forms', icon: 'search', shortcut: 'mod+k' },
  { id: 'sond:add-question', label: 'Add Question', icon: 'plus-circle', context: 'builder' },
  { id: 'sond:add-logic', label: 'Add Conditional Logic', icon: 'git-branch', context: 'builder' },
  { id: 'sond:publish-form', label: 'Publish Form', icon: 'upload', context: 'builder' },
  { id: 'sond:export-csv', label: 'Export Submissions CSV', icon: 'download', context: 'submissions' },
  { id: 'sond:connect-spark', label: 'Connect to SPARK', icon: 'zap', context: 'submissions' },
  { id: 'sond:connect-cinq', label: 'Connect to CINQ', icon: 'users', context: 'submissions' },
];
