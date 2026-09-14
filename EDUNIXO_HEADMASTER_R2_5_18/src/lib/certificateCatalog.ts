export interface CertificateLanguageOption {
  code: string;
  name: string;
  nativeName: string;
  direction?: 'ltr' | 'rtl';
}

// 22 Eighth Schedule languages plus English for school-document workflows.
export const CERTIFICATE_LANGUAGE_OPTIONS: CertificateLanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो' },
  { code: 'doi', name: 'Dogri', nativeName: 'डोगरी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', direction: 'rtl' },
  { code: 'kok', name: 'Konkani', nativeName: 'कोंकणी' },
  { code: 'mai', name: 'Maithili', nativeName: 'मैथिली' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mni', name: 'Manipuri', nativeName: 'ꯃꯤꯇꯩ ꯂꯣꯟ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्' },
  { code: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', direction: 'rtl' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl' },
];

export type CertificateBorderStyle = 'solid' | 'double' | 'ornate';
export type CertificateTemplateLayout =
  | 'official-lc'
  | 'midnight-gold'
  | 'school-geometric'
  | 'institutional-crest'
  | 'ornate-heritage'
  | 'emerald-modern'
  | 'maroon-classic'
  | 'minimal-clean'
  | 'urdu-heritage'
  | 'medal-column'
  | 'wave-modern'
  | 'laurel-classic'
  | 'corner-ribbon'
  | 'split-luxury'
  | 'diamond-frame'
  | 'academic-banner'
  | 'soft-geometric';

export interface CertificateTemplatePreset {
  id: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  secondary: string;
  borderStyle: CertificateBorderStyle;
  showWatermark: boolean;
  showLogo: boolean;
  signaturePosition: 'bottom' | 'split';
  officialLc?: boolean;
  recommendedFor: string;
  layout: CertificateTemplateLayout;
  background: string;
  foreground: string;
  surface: string;
  orientation: 'portrait' | 'landscape';
}

// Original EDUNIXO template library. These are independently composed presets built
// from common certificate design conventions; no third-party template artwork is embedded.
export const CERTIFICATE_TEMPLATE_PRESETS: CertificateTemplatePreset[] = [
  {
    id: 'official-lc-reference', name: 'Official School Leaving Certificate', category: 'Statutory / LC',
    description: 'Reference-aligned pink double-border LC with protected statutory fields and official register structure.',
    accent: '#b94d63', secondary: '#f8e6ea', borderStyle: 'double', showWatermark: false, showLogo: true,
    signaturePosition: 'split', officialLc: true, recommendedFor: 'Leaving Certificate / Transfer Certificate',
    layout: 'official-lc', background: '#fffdf9', foreground: '#4b3d43', surface: '#fffdf9', orientation: 'portrait'
  },

  // Portrait collection
  {
    id: 'portrait-crest-gold', name: 'Imperial Crest Gold', category: 'Portrait · Formal',
    description: 'Navy crest header, refined gold frame and ceremonial seal composition.',
    accent: '#17365d', secondary: '#d9b85f', borderStyle: 'double', showWatermark: true, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Diploma, Merit, Completion', layout: 'institutional-crest',
    background: '#fbfaf6', foreground: '#132847', surface: '#fbfaf6', orientation: 'portrait'
  },
  {
    id: 'portrait-medal-navy', name: 'Navy Medal Laureate', category: 'Portrait · Award',
    description: 'Medal-column layout with navy ribbon and warm gold recognition accents.',
    accent: '#10294f', secondary: '#d8b24d', borderStyle: 'double', showWatermark: false, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Rank, Sports, Excellence', layout: 'medal-column',
    background: '#fffdf7', foreground: '#111827', surface: '#fffdf7', orientation: 'portrait'
  },
  {
    id: 'portrait-laurel-ivory', name: 'Ivory Laurel Distinction', category: 'Portrait · Elegant',
    description: 'Traditional laurel framing with ivory paper, fine gold rule and formal serif hierarchy.',
    accent: '#9b7a2f', secondary: '#d8c690', borderStyle: 'ornate', showWatermark: true, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Academic Distinction, Honour', layout: 'laurel-classic',
    background: '#fffdf6', foreground: '#3b3426', surface: '#fffdf6', orientation: 'portrait'
  },
  {
    id: 'portrait-purple-wave', name: 'Royal Violet Wave', category: 'Portrait · Modern',
    description: 'Premium violet wave geometry with restrained gold accents and clean school branding.',
    accent: '#5b2a86', secondary: '#e2b84f', borderStyle: 'solid', showWatermark: false, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Participation, Appreciation', layout: 'wave-modern',
    background: '#ffffff', foreground: '#221934', surface: '#ffffff', orientation: 'portrait'
  },
  {
    id: 'portrait-maroon-honour', name: 'Maroon Honour Classic', category: 'Portrait · Traditional',
    description: 'Deep maroon double frame with dignified gold corners and academic composition.',
    accent: '#7b2435', secondary: '#c9a55b', borderStyle: 'double', showWatermark: true, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Character, Conduct, Merit', layout: 'maroon-classic',
    background: '#fffaf0', foreground: '#4e2230', surface: '#fffaf0', orientation: 'portrait'
  },
  {
    id: 'portrait-emerald-banner', name: 'Emerald Scholar Banner', category: 'Portrait · Academic',
    description: 'Strong academic banner with emerald edge architecture and gold verification details.',
    accent: '#0f6a52', secondary: '#d9b86b', borderStyle: 'solid', showWatermark: true, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Study, Bonafide, Completion', layout: 'academic-banner',
    background: '#fffef9', foreground: '#15342b', surface: '#fffef9', orientation: 'portrait'
  },
  {
    id: 'portrait-black-gold', name: 'Obsidian Gold Prestige', category: 'Portrait · Luxury',
    description: 'Black ceremonial field with a centered ivory certificate panel and metallic gold geometry.',
    accent: '#d9b552', secondary: '#766022', borderStyle: 'ornate', showWatermark: false, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Special Honour, Leadership', layout: 'split-luxury',
    background: '#111827', foreground: '#f8e9b5', surface: '#fffdf7', orientation: 'portrait'
  },
  {
    id: 'portrait-clean-official', name: 'Executive Ivory Official', category: 'Portrait · Minimal',
    description: 'Low-ink premium office certificate with exact alignment and quiet institutional detail.',
    accent: '#334155', secondary: '#cbd5e1', borderStyle: 'solid', showWatermark: false, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Routine Office Certificates', layout: 'minimal-clean',
    background: '#fffefb', foreground: '#1f2937', surface: '#fffefb', orientation: 'portrait'
  },

  {
    id: 'portrait-rose-diamond', name: 'Rose Gold Scholar', category: 'Portrait · Premium',
    description: 'Soft rose-gold diamond architecture with elegant ivory center and polished academic hierarchy.',
    accent: '#a85568', secondary: '#d7ad76', borderStyle: 'double', showWatermark: true, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Merit, Scholarship, Appreciation', layout: 'diamond-frame',
    background: '#fffaf8', foreground: '#4a2930', surface: '#fffaf8', orientation: 'portrait'
  },
  {
    id: 'portrait-teal-ribbon', name: 'Teal Ribbon Excellence', category: 'Portrait · Contemporary',
    description: 'Vertical teal ribbon structure with champagne-gold accents and formal school seal space.',
    accent: '#0f5f67', secondary: '#d8bd74', borderStyle: 'double', showWatermark: false, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Achievement, Service, Leadership', layout: 'corner-ribbon',
    background: '#fffef9', foreground: '#173d41', surface: '#fffef9', orientation: 'portrait'
  },
  {
    id: 'portrait-sapphire-geometry', name: 'Sapphire Geometry', category: 'Portrait · Modern',
    description: 'Sapphire and ice-blue geometric framing with strong modern school identity and open content space.',
    accent: '#214f86', secondary: '#9bc6e8', borderStyle: 'solid', showWatermark: false, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Project, Participation, Recognition', layout: 'soft-geometric',
    background: '#fbfdff', foreground: '#183554', surface: '#fbfdff', orientation: 'portrait'
  },

  // Landscape collection
  {
    id: 'landscape-midnight-gold', name: 'Midnight Gold Distinction', category: 'Landscape · Luxury',
    description: 'Deep midnight field with sweeping gold corner geometry and premium central typography.',
    accent: '#e8c35a', secondary: '#8f6c19', borderStyle: 'ornate', showWatermark: false, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Achievement, Excellence, Honour', layout: 'midnight-gold',
    background: '#07152f', foreground: '#f8e7a6', surface: '#07152f', orientation: 'landscape'
  },
  {
    id: 'landscape-scholar-blue', name: 'Scholar Blue Celebration', category: 'Landscape · School',
    description: 'Bright school certificate with layered blue-gold geometric corners and generous name space.',
    accent: '#245293', secondary: '#e0bb63', borderStyle: 'solid', showWatermark: false, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Congratulations, Participation', layout: 'school-geometric',
    background: '#ffffff', foreground: '#172033', surface: '#ffffff', orientation: 'landscape'
  },
  {
    id: 'landscape-gold-ribbon', name: 'Gold Ribbon Laureate', category: 'Landscape · Award',
    description: 'Formal ribbon-and-medal composition inspired by classic award stationery without copied artwork.',
    accent: '#b88a28', secondary: '#1d3156', borderStyle: 'double', showWatermark: false, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Winner, Rank, Sports', layout: 'corner-ribbon',
    background: '#fffdf7', foreground: '#1f2937', surface: '#fffdf7', orientation: 'landscape'
  },
  {
    id: 'landscape-heritage-gold', name: 'Heritage Gold Flourish', category: 'Landscape · Ceremonial',
    description: 'Charcoal-blue certificate with original gold ornamental flourishes and formal serif hierarchy.',
    accent: '#e5ad38', secondary: '#7d8da2', borderStyle: 'ornate', showWatermark: true, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Honorary, Recognition, Excellence', layout: 'ornate-heritage',
    background: '#34465a', foreground: '#fff5d6', surface: '#34465a', orientation: 'landscape'
  },
  {
    id: 'landscape-emerald-modern', name: 'Emerald Academic Modern', category: 'Landscape · Modern',
    description: 'Contemporary emerald-and-ivory layout with strong title space and clean verification area.',
    accent: '#0f6a52', secondary: '#d9b86b', borderStyle: 'solid', showWatermark: true, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Bonafide, Study, Merit', layout: 'emerald-modern',
    background: '#fffef8', foreground: '#15342b', surface: '#fffef8', orientation: 'landscape'
  },
  {
    id: 'landscape-diamond-blue', name: 'Sapphire Diamond Academic', category: 'Landscape · Premium',
    description: 'Sapphire diamond frame with gold intersections and a high-end academic center field.',
    accent: '#1e4f91', secondary: '#d6b45b', borderStyle: 'double', showWatermark: true, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Excellence, Scholarship, Academic Award', layout: 'diamond-frame',
    background: '#fdfefe', foreground: '#172f56', surface: '#fdfefe', orientation: 'landscape'
  },
  {
    id: 'landscape-soft-aqua', name: 'Aqua Geometry Excellence', category: 'Landscape · Contemporary',
    description: 'Soft aqua geometric architecture with navy text and premium asymmetric white space.',
    accent: '#0f6f7d', secondary: '#82cbd2', borderStyle: 'solid', showWatermark: false, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Science Fair, Project, Workshop', layout: 'soft-geometric',
    background: '#fbffff', foreground: '#163b46', surface: '#fbffff', orientation: 'landscape'
  },
  {
    id: 'landscape-urdu-heritage', name: 'Urdu Heritage Formal', category: 'Landscape · Multilingual',
    description: 'Maroon-green institutional layout balanced for Urdu and bilingual school certificates.',
    accent: '#6d213c', secondary: '#0f5d46', borderStyle: 'double', showWatermark: true, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Urdu / Bilingual Certificates', layout: 'urdu-heritage',
    background: '#fffdf7', foreground: '#3d2430', surface: '#fffdf7', orientation: 'landscape'
  },
  {
    id: 'landscape-maroon-classic', name: 'Burgundy Academic Classic', category: 'Landscape · Traditional',
    description: 'Formal burgundy academic frame with warm gold detail and polished school presentation.',
    accent: '#77283c', secondary: '#d1ab58', borderStyle: 'double', showWatermark: true, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Passing, Conduct, Appreciation', layout: 'maroon-classic',
    background: '#fffaf4', foreground: '#42232d', surface: '#fffaf4', orientation: 'landscape'
  },
  {
    id: 'landscape-violet-wave', name: 'Violet Celebration Wave', category: 'Landscape · Modern',
    description: 'High-energy violet wave composition with warm gold highlight and spacious recipient typography.',
    accent: '#5c2a87', secondary: '#e2b84f', borderStyle: 'solid', showWatermark: false, showLogo: true,
    signaturePosition: 'split', recommendedFor: 'Celebration, Participation, Appreciation', layout: 'wave-modern',
    background: '#ffffff', foreground: '#261a35', surface: '#ffffff', orientation: 'landscape'
  },
  {
    id: 'landscape-obsidian-prestige', name: 'Obsidian Gold Prestige', category: 'Landscape · Luxury',
    description: 'Dramatic obsidian outer field with floating ivory award panel and architectural gold corners.',
    accent: '#d6b24e', secondary: '#806923', borderStyle: 'ornate', showWatermark: false, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Top Honour, Leadership, Excellence', layout: 'split-luxury',
    background: '#101827', foreground: '#f8e9b5', surface: '#fffdf7', orientation: 'landscape'
  },
  {
    id: 'landscape-laurel-ivory', name: 'Ivory Laurel Excellence', category: 'Landscape · Elegant',
    description: 'Quiet ivory award with balanced laurel ornament, double rule and premium serif composition.',
    accent: '#947226', secondary: '#d9c88e', borderStyle: 'ornate', showWatermark: true, showLogo: true,
    signaturePosition: 'bottom', recommendedFor: 'Excellence, Academic Honour, Service', layout: 'laurel-classic',
    background: '#fffdf5', foreground: '#3c3526', surface: '#fffdf5', orientation: 'landscape'
  }
];

export const DEFAULT_CERTIFICATE_TEMPLATE_ID = 'landscape-scholar-blue';
export const CERTIFICATE_TEMPLATE_STORAGE_KEY = 'edunixo_certificate_selected_template_v2';
export const CERTIFICATE_LANGUAGE_STORAGE_KEY = 'edunixo_certificate_selected_language_v1';
export const CERTIFICATE_STUDENT_GR_STORAGE_KEY = 'edunixo_certificate_selected_student_gr_v1';

export function getCertificateTemplatePreset(id?: string | null) {
  return CERTIFICATE_TEMPLATE_PRESETS.find((item) => item.id === id)
    || CERTIFICATE_TEMPLATE_PRESETS.find((item) => item.id === DEFAULT_CERTIFICATE_TEMPLATE_ID)!;
}
