/* ============================================================
   Phase 1: 5 Layouts × 6 Colors = 30 PREMIUM Designs
   Each layout is VISUALLY COMPLETELY DIFFERENT.
   ============================================================ */

export type LayoutFamily = 'classic_grid' | 'sidebar_left' | 'banner_hero' | 'two_column' | 'minimal_clean';
export type HeaderStyle = 'gradient' | 'solid' | 'minimal' | 'ribbon' | 'ornate';
export type BorderStyle = 'gold_foil' | 'double_gold' | 'navy_silver' | 'ornate' | 'elegant_thin' | 'none';
export type Decoration = 'circles' | 'triangles' | 'ribbons' | 'stars' | 'waves' | 'flourish' | 'none';
export type FontTitle = 'Playfair Display' | 'Cormorant Garamond' | 'Cinzel' | 'Merriweather' | 'Poppins' | 'Inter';
export type FontBody = 'Inter' | 'Lato' | 'Poppins' | 'Roboto' | 'Open Sans' | 'Merriweather';

export interface ProgressCardDesign {
  id: string;
  name: string;
  layout: LayoutFamily;
  tier: 'premium' | 'royal' | 'elite';

  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  goldColor: string;
  backgroundColor: string;
  textColor: string;

  headerStyle: HeaderStyle;
  borderStyle: BorderStyle;
  decoration: Decoration;
  fontTitle: FontTitle;
  fontBody: FontBody;

  hasCornerOrnaments: boolean;
  hasMedalBadge: boolean;
  hasGoldFoil: boolean;
  hasRibbonBanner: boolean;
  hasElegantDivider: boolean;
  hasWatermark: boolean;
  hasEmbossedTitle: boolean;
  hasSparkleAccent: boolean;
}

// ─── 6 Premium Color Schemes ─────────────────────────────────
type ColorScheme = {
  key: string;
  name: string;
  primary: string; secondary: string; accent: string; gold: string;
  bg: string; text: string;
  tier: 'premium' | 'royal' | 'elite';
};

const COLOR_SCHEMES: ColorScheme[] = [
  { key: 'navy_gold',     name: 'Navy Gold',     primary: '#06163f', secondary: '#0b3d86', accent: '#fbbf24', gold: '#fde047', bg: '#f8fbff', text: '#0f172a', tier: 'royal' },
  { key: 'purple_royal',  name: 'Royal Purple',  primary: '#3b0764', secondary: '#6b21a8', accent: '#fbbf24', gold: '#fde047', bg: '#faf5ff', text: '#1e1b4b', tier: 'royal' },
  { key: 'emerald_gold',  name: 'Emerald Gold',  primary: '#064e3b', secondary: '#047857', accent: '#fbbf24', gold: '#fde047', bg: '#ecfdf5', text: '#064e3b', tier: 'royal' },
  { key: 'maroon_gold',   name: 'Maroon Gold',   primary: '#7f1d1d', secondary: '#991b1b', accent: '#fcd34d', gold: '#fde047', bg: '#fef2f2', text: '#450a0a', tier: 'royal' },
  { key: 'charcoal_gold', name: 'Charcoal Gold', primary: '#0a0a0a', secondary: '#1c1917', accent: '#eab308', gold: '#fde047', bg: '#fafaf9', text: '#0a0a0a', tier: 'elite' },
  { key: 'teal_silver',   name: 'Teal Silver',   primary: '#0f766e', secondary: '#14b8a6', accent: '#cbd5e1', gold: '#f1f5f9', bg: '#f0fdfa', text: '#134e4a', tier: 'premium' },
];

// ─── 5 Layout Families ───────────────────────────────────────
type LayoutConfig = {
  key: LayoutFamily;
  title: string;
  headerStyle: HeaderStyle;
  borderStyle: BorderStyle;
  decoration: Decoration;
  fontTitle: FontTitle;
  fontBody: FontBody;
  hasCornerOrnaments: boolean;
  hasMedalBadge: boolean;
  hasGoldFoil: boolean;
  hasRibbonBanner: boolean;
  hasElegantDivider: boolean;
  hasWatermark: boolean;
  hasEmbossedTitle: boolean;
  hasSparkleAccent: boolean;
};

const LAYOUTS: LayoutConfig[] = [
  {
    key: 'classic_grid',
    title: 'Classic Grid',
    headerStyle: 'gradient', borderStyle: 'gold_foil', decoration: 'circles',
    fontTitle: 'Playfair Display', fontBody: 'Inter',
    hasCornerOrnaments: true, hasMedalBadge: true, hasGoldFoil: true,
    hasRibbonBanner: true, hasElegantDivider: true, hasWatermark: false,
    hasEmbossedTitle: true, hasSparkleAccent: true,
  },
  {
    key: 'sidebar_left',
    title: 'Sidebar Left',
    headerStyle: 'solid', borderStyle: 'elegant_thin', decoration: 'none',
    fontTitle: 'Inter', fontBody: 'Inter',
    hasCornerOrnaments: false, hasMedalBadge: false, hasGoldFoil: false,
    hasRibbonBanner: false, hasElegantDivider: false, hasWatermark: false,
    hasEmbossedTitle: false, hasSparkleAccent: false,
  },
  {
    key: 'banner_hero',
    title: 'Banner Hero',
    headerStyle: 'ornate', borderStyle: 'double_gold', decoration: 'stars',
    fontTitle: 'Cinzel', fontBody: 'Lato',
    hasCornerOrnaments: true, hasMedalBadge: true, hasGoldFoil: true,
    hasRibbonBanner: true, hasElegantDivider: true, hasWatermark: true,
    hasEmbossedTitle: true, hasSparkleAccent: true,
  },
  {
    key: 'two_column',
    title: 'Two Column',
    headerStyle: 'minimal', borderStyle: 'navy_silver', decoration: 'none',
    fontTitle: 'Cormorant Garamond', fontBody: 'Poppins',
    hasCornerOrnaments: true, hasMedalBadge: false, hasGoldFoil: false,
    hasRibbonBanner: false, hasElegantDivider: true, hasWatermark: false,
    hasEmbossedTitle: false, hasSparkleAccent: true,
  },
  {
    key: 'minimal_clean',
    title: 'Minimal Clean',
    headerStyle: 'minimal', borderStyle: 'none', decoration: 'none',
    fontTitle: 'Inter', fontBody: 'Inter',
    hasCornerOrnaments: false, hasMedalBadge: false, hasGoldFoil: false,
    hasRibbonBanner: false, hasElegantDivider: false, hasWatermark: false,
    hasEmbossedTitle: false, hasSparkleAccent: false,
  },
];

// ─── Generate 30 designs (5 layouts × 6 colors) ──────────────
export const DESIGNS: ProgressCardDesign[] = LAYOUTS.flatMap((layout, li) =>
  COLOR_SCHEMES.map((color, ci) => ({
    id: `L${li + 1}_C${ci + 1}`,
    name: `${layout.title} · ${color.name}`,
    layout: layout.key,
    tier: color.tier,
    primaryColor: color.primary,
    secondaryColor: color.secondary,
    accentColor: color.accent,
    goldColor: color.gold,
    backgroundColor: color.bg,
    textColor: color.text,
    headerStyle: layout.headerStyle,
    borderStyle: layout.borderStyle,
    decoration: layout.decoration,
    fontTitle: layout.fontTitle,
    fontBody: layout.fontBody,
    hasCornerOrnaments: layout.hasCornerOrnaments,
    hasMedalBadge: layout.hasMedalBadge,
    hasGoldFoil: layout.hasGoldFoil,
    hasRibbonBanner: layout.hasRibbonBanner,
    hasElegantDivider: layout.hasElegantDivider,
    hasWatermark: layout.hasWatermark,
    hasEmbossedTitle: layout.hasEmbossedTitle,
    hasSparkleAccent: layout.hasSparkleAccent,
  }))
);

export const DESIGN_COUNT = DESIGNS.length;
export const LAYOUT_COUNT = LAYOUTS.length;
