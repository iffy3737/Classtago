import { useEffect, useState } from 'react';
import { Home, Calendar, BarChart3, User } from 'lucide-react';

const TABS = [
  { id: 'home',       label: 'Home',       hash: 'module=overview',           matchPrefixes: ['overview'] },
  { id: 'attendance', label: 'Attendance', hash: 'module=attendance',         matchPrefixes: ['attendance', 'leave_management'] },
  { id: 'results',    label: 'Results',    hash: 'module=result_management',  matchPrefixes: ['result_management', 'exams', 'analytics'] },
  { id: 'profile',    label: 'Profile',    hash: 'module=security',           matchPrefixes: ['security', 'profile'] },
];

const ICONS = { home: Home, attendance: Calendar, results: BarChart3, profile: User };

export default function BottomNav() {
  const [activeId, setActiveId] = useState('home');

  useEffect(() => {
    console.log('[BottomNav] MOUNTED — bottom nav is in the DOM');
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

  const go = (tab: any) => {
    const next = `#${tab.hash}`;
    if (window.location.hash !== next) {
      window.location.hash = tab.hash;
    } else {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  return (
    <nav className="cs-bottom-nav" aria-label="Primary navigation" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
      background: '#FFFFFF', borderTop: '1px solid #F5ECF7',
      boxShadow: '0 -8px 28px -8px rgba(255, 52, 115, 0.15)',
      padding: '8px 6px calc(10px + env(safe-area-inset-bottom, 0px))',
      display: 'flex', justifyContent: 'space-around', alignItems: 'stretch'
    }}>
      {TABS.map((tab) => {
        const Icon = (ICONS as any)[tab.id];
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`cs-nav-item ${isActive ? 'cs-nav-item-active' : ''}`}
            onClick={() => go(tab)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '3px', background: 'transparent',
              border: 'none', padding: '6px 4px', cursor: 'pointer'
            }}
          >
            <span className="cs-nav-icon-wrap" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '58px', height: '30px', borderRadius: '100px',
              background: isActive ? 'linear-gradient(135deg, #FF3473, #FFA202)' : 'transparent'
            }}>
              <Icon size={22} style={{ color: isActive ? '#FFF' : '#6B5E7B' }} />
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 700,
              color: isActive ? '#FF3473' : '#6B5E7B'
            }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
