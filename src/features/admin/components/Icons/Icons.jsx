const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function DashboardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg {...iconProps}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <polyline points="4 15 9 10 13 13 20 6" />
    </svg>
  );
}

export function AlertIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg {...iconProps} width={18} height={18}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg {...iconProps} width={18} height={18}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" />
      <path d="M16 4a4 4 0 0 1 0 8" />
      <path d="M22 21v-1a6 6 0 0 0-4-5.6" />
    </svg>
  );
}

export function ForecastIcon() {
  return (
    <svg {...iconProps}>
      <line x1="4" y1="20" x2="20" y2="20" />
      <polyline points="4 16 9 12 12 14" />
      <polyline points="12 14 20 6" strokeDasharray="2 3" />
    </svg>
  );
}

export function GiftIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
      <line x1="12" y1="8" x2="12" y2="21" />
      <path d="M12 8c-1.5-3-5-4-5.5-1.5S9 8 12 8c3 0 6-.5 5.5-1.5S13.5 5 12 8z" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function FlagIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </svg>
  );
}

export function GearIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function ReportIcon() {
  return (
    <svg {...iconProps}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function KeyIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 21 2M16 7l3 3M18.5 4.5l2 2" />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
