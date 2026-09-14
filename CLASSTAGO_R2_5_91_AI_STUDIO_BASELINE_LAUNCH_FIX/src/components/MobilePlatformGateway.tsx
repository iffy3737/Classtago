/**
 * Classtago premium mobile launcher.
 * App-first multi-school entry: remember the last selected school, discover another
 * subscribed school, then authenticate inside that school scope. Platform Super
 * Admin remains a separate, discreet secure entrance.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, GraduationCap, Loader2,
  MapPin, Search, ShieldCheck, Sparkles
} from 'lucide-react';
import { Language, User } from '../types';
import LoginSection from './LoginSection';
import PlatformAdminLogin from './PlatformAdminLogin';
import { readAppSchoolContext, writeAppSchoolContext } from '../lib/appSchoolContext';

type MobileSchool = {
  id: string;
  schoolCode: string;
  schoolName: string;
  slug?: string;
  city?: string | null;
  state?: string | null;
  logoUrl?: string | null;
  tagline?: string | null;
  portalAvailable?: boolean;
};

type GatewayMode = 'discover' | 'school-login' | 'platform-admin';

interface MobilePlatformGatewayProps {
  lang: Language;
  onLoginSuccess: (user: User) => void;
  onSchoolSelected?: (school: { id: string; schoolCode: string; schoolName: string; tagline?: string | null }) => void;
}

function readRecentSchool(): MobileSchool | null {
  const school = readAppSchoolContext();
  if (!school?.id || !school.schoolCode || !school.schoolName) return null;
  return school as MobileSchool;
}

export default function MobilePlatformGateway({ lang, onLoginSuccess, onSchoolSelected }: MobilePlatformGatewayProps) {
  const [mode, setMode] = useState<GatewayMode>('discover');
  const [query, setQuery] = useState('');
  const [schools, setSchools] = useState<MobileSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<MobileSchool | null>(null);
  const [recentSchool, setRecentSchool] = useState<MobileSchool | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    setRecentSchool(readRecentSchool());
  }, []);

  useEffect(() => {
    if (mode !== 'discover' || normalizedQuery.length < 1) {
      setSchools([]);
      setError('');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/public/schools?query=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'School directory could not be loaded.');
        setSchools(Array.isArray(payload?.schools) ? payload.schools : []);
      } catch (searchError: any) {
        if (searchError?.name !== 'AbortError') {
          setSchools([]);
          setError(searchError?.message || 'School directory could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mode, normalizedQuery]);

  const chooseSchool = (school: MobileSchool) => {
    setSelectedSchool(school);
    setRecentSchool(school);
    writeAppSchoolContext(school);
    onSchoolSelected?.(school);
    setMode('school-login');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToDiscover = () => {
    setMode('discover');
    setSelectedSchool(null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (mode === 'school-login' && selectedSchool) {
    return (
      <main className="edx-gateway-shell edx-app-launcher-shell">
        <section className="edx-gateway-login-stage">
          <button type="button" className="edx-gateway-back" onClick={backToDiscover}>
            <ArrowLeft size={17} /> Choose another school
          </button>

          <div className="edx-gateway-login-context">
            <div className="edx-gateway-login-context-logo">
              {selectedSchool.logoUrl
                ? <img src={selectedSchool.logoUrl} alt="" />
                : <GraduationCap size={20} />}
            </div>
            <div className="edx-gateway-login-context-copy">
              <span>Secure school workspace</span>
              <strong>{selectedSchool.schoolName}</strong>
              <small>{selectedSchool.schoolCode}</small>
            </div>
            <CheckCircle2 size={20} />
          </div>

          <div className="edx-gateway-login-card edx-gateway-login-card-premium">
            <LoginSection
              lang={lang}
              onLoginSuccess={onLoginSuccess}
              schoolId={selectedSchool.id}
              schoolCode={selectedSchool.schoolCode}
              schoolName={selectedSchool.schoolName}
            />
          </div>
        </section>
      </main>
    );
  }

  if (mode === 'platform-admin') {
    return (
      <main className="edx-gateway-shell edx-app-launcher-shell">
        <section className="edx-gateway-login-stage">
          <button type="button" className="edx-gateway-back" onClick={backToDiscover}>
            <ArrowLeft size={17} /> Back to Classtago
          </button>
          <div className="edx-gateway-admin-heading">
            <div className="edx-gateway-admin-mark"><ShieldCheck size={24} /></div>
            <div>
              <span>Platform governance</span>
              <h1>Classtago Super Admin</h1>
              <p>Global platform access is isolated from every school login.</p>
            </div>
          </div>
          <PlatformAdminLogin onLoginSuccess={onLoginSuccess} />
        </section>
      </main>
    );
  }

  return (
    <main className="edx-gateway-shell edx-app-launcher-shell">
      <section className="edx-gateway-hero edx-app-launcher-hero">
        <div className="edx-gateway-brand-row">
          <div className="edx-gateway-brand-mark"><GraduationCap size={28} /></div>
          <div>
            <span>Classtago</span>
            <strong>School Operating System</strong>
          </div>
        </div>

        <div className="edx-gateway-badge"><Sparkles size={14} /> Premium school workspace</div>
        <h1>Welcome to<br />Classtago.</h1>
        <p>Select your school and continue securely to your personal ERP workspace.</p>

        {recentSchool && (
          <button type="button" className="edx-app-recent-school" onClick={() => chooseSchool(recentSchool)}>
            <div className="edx-app-recent-school-logo">
              {recentSchool.logoUrl ? <img src={recentSchool.logoUrl} alt="" /> : <Building2 size={22} />}
            </div>
            <div className="edx-app-recent-school-copy">
              <span>Continue to your school</span>
              <strong>{recentSchool.schoolName}</strong>
              <small>{recentSchool.schoolCode}{recentSchool.city ? ` · ${recentSchool.city}` : ''}</small>
            </div>
            <ArrowRight size={19} />
          </button>
        )}

        <div className="edx-gateway-search-card edx-app-school-search">
          <label htmlFor="edx-school-search">{recentSchool ? 'Use another school' : 'Find your school'}</label>
          <div className="edx-gateway-search-field">
            <Search size={19} />
            <input
              id="edx-school-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="School name, code or city"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Loader2 className="edx-gateway-spinner" size={18} />}
          </div>
          <small>Search only active schools connected to Classtago.</small>
        </div>
      </section>

      <section className="edx-gateway-results edx-app-school-results" aria-live="polite">
        {error && <div className="edx-gateway-error">{error}</div>}

        {!error && normalizedQuery.length >= 1 && !loading && schools.length === 0 && (
          <div className="edx-gateway-empty">
            <Building2 size={24} />
            <strong>No active school found</strong>
            <span>Check the school name/code or contact your school administrator.</span>
          </div>
        )}

        {schools.map((school) => (
          <button key={school.id} type="button" className="edx-gateway-school-result" onClick={() => chooseSchool(school)}>
            <div className="edx-gateway-result-logo">
              {school.logoUrl ? <img src={school.logoUrl} alt="" /> : <Building2 size={22} />}
            </div>
            <div className="edx-gateway-result-copy">
              <strong>{school.schoolName}</strong>
              <span>{school.schoolCode}</span>
              {(school.city || school.state) && <small><MapPin size={12} /> {[school.city, school.state].filter(Boolean).join(', ')}</small>}
            </div>
            <ArrowRight size={18} />
          </button>
        ))}
      </section>

      <section className="edx-app-launcher-trust" aria-label="Classtago security">
        <div><ShieldCheck size={17} /><span><strong>Secure access</strong><small>Role protected</small></span></div>
        <div><Building2 size={17} /><span><strong>School isolated</strong><small>Separate data</small></span></div>
        <div><CheckCircle2 size={17} /><span><strong>Cloud ready</strong><small>Always connected</small></span></div>
      </section>

      <button type="button" className="edx-app-admin-entry" onClick={() => setMode('platform-admin')}>
        <ShieldCheck size={15} /> Platform Administrator
      </button>

      <div className="edx-app-launcher-foot">Classtago · Secure school operating system</div>
    </main>
  );
}
