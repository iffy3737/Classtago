import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Home, Calendar, BarChart3, User } from 'lucide-react';

const TABS = [
  { id: 'home',       label: 'Home',       hash: 'module=overview',           moduleId: 'tr-teacher-dashboard',      featureId: undefined,  matchPrefixes: ['overview'] },
  { id: 'attendance', label: 'Attendance', hash: 'module=attendance',         moduleId: 'tr-attendance-daily',       featureId: undefined,  matchPrefixes: ['attendance', 'leave_management'] },
  { id: 'results',    label: 'Results',    hash: 'module=result_management',  moduleId: 'tr-result-subject-marks',   featureId: undefined,  matchPrefixes: ['result_management', 'exams', 'analytics'] },
  { id: 'profile',    label: 'Profile',    hash: 'module=security',           moduleId: 'tr-complete-profile',       featureId: undefined,  matchPrefixes: ['security', 'profile'] },
];

const ICONS = { home: Home, attendance: Calendar, results: BarChart3, profile: User };

export default function BottomNav() {
  const [activeId, setActiveId] = useState('home');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    const readHash = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(rawHash);
      const mod = String(params.get('module') || 'overview').toLowerCase();
      const match = TABS.find((tab) => tab.matchPrefixes.some((p) => mod.startsWith(p)));
      const next = match?.id || 'home';
      setActiveId((current) => (current === next ? current : next));
    };
    readHash();
    window.addEventListener('hashchange', readHash);
    window.addEventListener('popstate', readHash);
    window.addEventListener('edunixo:route-change', readHash);
    return () => {
      window.removeEventListener('hashchange', readHash);
      window.removeEventListener('popstate', readHash);
      window.removeEventListener('edunixo:route-change', readHash);
    };
  }, []);

  const go = (tab: any) => {
    // Set active immediately so the indicator follows the tap.
    setActiveId(tab.id);
    try {
      const opener = (window as any).__classtago_maria_open_role_module;
      if (typeof opener === 'function' && opener(tab.moduleId, tab.featureId)) return;
    } catch {}
    const next = `#${tab.hash}`;
    if (window.location.hash !== next) {
      window.location.hash = tab.hash;
    } else {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  const nav = (
    <nav
      className="cs-bottom-nav-portal"
      aria-label="Primary navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999999,
        background: '#FFFFFF',
        borderTop: '2px solid #FF3473',
        boxShadow: '0 -8px 28px -8px rgba(255, 52, 115, 0.3)',
        padding: '8px 6px 12px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        height: '64px',
        boxSizing: 'border-box',
      }}
    >
      {TABS.map((tab) => {
        const Icon = (ICONS as any)[tab.id];
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => go(tab)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              background: 'transparent',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '28px',
                borderRadius: '100px',
                background: isActive ? 'linear-gradient(135deg, #FF3473, #FFA202)' : 'transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon size={20} style={{ color: isActive ? '#FFFFFF' : '#6B5E7B' }} />
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: isActive ? '#FF3473' : '#6B5E7B',
                letterSpacing: '0.01em',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );

  return createPortal(nav, document.body);
}
