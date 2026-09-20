/**
 * RoleHeroCard — reusable pink-orange gradient hero card.
 * Used across all roles (Teacher, Headmaster, Clerk, Student, Parent, Peon).
 * Adapts stat chips + greeting to the signed-in role.
 */
import React from 'react';

export type RoleHeroStat = {
  value: string | number;
  label: string;
};

type Props = {
  /** Full name of the signed-in user */
  name?: string;
  /** Role-specific workspace label, e.g. 'Teacher Workspace' */
  workspaceLabel?: string;
  /** Role key for future variations (currently unused visually) */
  role?: string;
  /** Stats to show as 3 chips. Provide 3 (or fewer). */
  stats?: RoleHeroStat[];
  /** Subtitle line(s) */
  subtitle?: string;
  /** Primary CTA */
  ctaLabel?: string;
  onCtaClick?: () => void;
  /** Show sparkle icon */
  showSparkle?: boolean;
};

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function firstName(name?: string): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] || 'there';
}

export default function RoleHeroCard({
  name,
  workspaceLabel = 'Workspace',
  stats,
  subtitle,
  ctaLabel,
  onCtaClick,
  showSparkle = true,
}: Props) {
  const visibleStats = (stats || []).slice(0, 3);
  return (
    <section className="cs-teacher-hero">
      <div className="cs-hero-top-row">
        <span className="cs-hero-badge">● {workspaceLabel.toUpperCase()}</span>
        {showSparkle && <span className="cs-hero-sparkle">✨</span>}
      </div>

      <h1 className="cs-hero-title">
        Good {timeGreeting()},
        <br />
        {firstName(name)}
      </h1>

      {subtitle && <p className="cs-hero-subtitle">{subtitle}</p>}

      {visibleStats.length > 0 && (
        <div className="cs-hero-stats" style={{ gridTemplateColumns: `repeat(${visibleStats.length}, 1fr)` }}>
          {visibleStats.map((stat, idx) => (
            <div className="cs-hero-stat" key={`${stat.label}-${idx}`}>
              <span className="cs-hero-stat-num">{stat.value}</span>
              <span className="cs-hero-stat-lbl">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {ctaLabel && onCtaClick && (
        <button type="button" onClick={onCtaClick} className="cs-hero-cta">
          {ctaLabel}
        </button>
      )}
    </section>
  );
}
