interface IconProps {
  className?: string;
}

export function PackageIcon({ className = 'h-10 w-10 text-muted-foreground' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4v10l8 4 8-4V7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8 4 8-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v10" />
    </svg>
  );
}

export function HistoryIcon({ className = 'h-10 w-10 text-muted-foreground' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
    </svg>
  );
}

export function WarehouseIcon({ className = 'h-10 w-10 text-muted-foreground' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V8l9-5 9 5v13" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-8h6v8" />
    </svg>
  );
}

export function BookmarkIcon({ className = 'h-10 w-10 text-muted-foreground' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v17l-6-4-6 4V4z" />
    </svg>
  );
}
