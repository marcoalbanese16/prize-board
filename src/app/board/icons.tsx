export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M8 21h8M12 17v4M7 4h10v3a5 5 0 0 1-10 0V4ZM7 5H4a3 3 0 0 0 3 3M17 5h3a3 3 0 0 1-3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TicketIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 1 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 1 0 0-4V8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 7v10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="1.5 2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
    </svg>
  );
}
