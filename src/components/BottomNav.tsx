/**
 * Classtago Bottom Navigation — Material 3 style Android tab bar.
 * Shows only in the native/URL app runtime. Uses the existing hash-based
 * router so it never bypasses role or plan gates.
 */
import { useEffect, useState } from 'react';
import { Home, Calendar, BarChart3, User } from 'lucide-react';
import { IS_EDUNIXO_APP_RUNTIME } from '../lib/mobileRuntime';

type Tab = {
  id: string;
  label: string;
  hash: string;
  matchPrefixes: string[];
};

const TABS: Tab[] = [
  { id: 'home',       label: 'Home',       hash: 'module=overview',              matchPrefixes: ['overview'] },
  { id: 'attendance', label: 'Attendance', hash: 'module=attendance',            matchPrefixes: ['attendance', 'leave_management'] },
  { id: 'results',    label: 'Results',    hash: 'module=result_management',     matchPrefixes: ['result_management', 'exams', 'analytics'] },
  { id: 'profile',    label: 'Profile',    hash: 'module=security',              matchPrefixes: ['security', 'profile'] },
];

const ICONS: Record<string, any> = {
  home: Home,
  attendance: Calendar,
  results: BarChart3,
  profile: User,
};

export default function BottomNav() {
  const [activeId, setActiveId] = useState('home');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readHash = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(rawHash);
      const mod = String(params.get('module') || 'overview').toLowerCase();
      const match = TABS.find((tab) => tab.matchPrefixes.some((p) => mod.startsWith(p)));
      setActiveId(match?.id || 'home');
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    return () => window.removeEventListener('hashchange', readHash);
  }, []);

  if (!IS_EDUNIXO_APP_RUNTIME) return null;

  const go = (tab: Tab) => {
    const next = `#${tab.hash}`;
    if (window.location.hash !== next) {
      window.location.hash = tab.hash;
    } else {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <nav className="cs-bottom-nav" aria-label="Primary navigation">
      {TABS.map((tab) => {
        const Icon = ICONS[tab.id];
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`cs-nav-item ${isActive ? 'cs-nav-item-active' : ''}`}
            onClick={() => go(tab)}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="cs-nav-icon-wrap">
              <Icon className="cs-nav-icon" size={22} />
            </span>
            <span className="cs-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
