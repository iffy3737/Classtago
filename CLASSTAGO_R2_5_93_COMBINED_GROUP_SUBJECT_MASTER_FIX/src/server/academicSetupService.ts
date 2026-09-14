import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function arrayOf<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function nullableText(value: unknown, max = 500): string | null {
  const cleaned = cleanText(value, max);
  return cleaned || null;
}

function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeBoolean(value: unknown, fallback = false): boolean {
  return value === undefined || value === null ? fallback : value === true;
}

function validUuid(value: unknown): string | null {
  const candidate = cleanText(value, 60);
  return UUID_RE.test(candidate) ? candidate : null;
}

function to24Hour(value: unknown): string | null {
  const raw = cleanText(value, 30);
  if (!raw) return null;
  const match12 = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)$/i);
  if (match12) {
    let hour = Number(match12[1]);
    const minute = Number(match12[2]);
    const second = Number(match12[3] || 0);
    const meridiem = match12[4].toUpperCase();
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  }
  const match24 = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hour = Math.min(23, Math.max(0, Number(match24[1])));
    const minute = Math.min(59, Math.max(0, Number(match24[2])));
    const second = Math.min(59, Math.max(0, Number(match24[3] || 0)));
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  }
  return null;
}

function to12Hour(value: unknown, fallback = ''): string {
  const raw = cleanText(value, 30);
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return fallback;
  const hour24 = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${meridiem}`;
}

function timeToSeconds(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function normalizeOrderedTimePair(
  preferredStart: unknown,
  preferredEnd: unknown,
  fallbackStart?: unknown,
  fallbackEnd?: unknown
): { start: string | null; end: string | null; source: 'preferred' | 'fallback' | 'cleared' } {
  const candidates: Array<{ start: unknown; end: unknown; source: 'preferred' | 'fallback' }> = [
    { start: preferredStart, end: preferredEnd, source: 'preferred' },
    { start: fallbackStart, end: fallbackEnd, source: 'fallback' }
  ];

  for (const candidate of candidates) {
    const start = to24Hour(candidate.start);
    const end = to24Hour(candidate.end);
    const startSeconds = timeToSeconds(start);
    const endSeconds = timeToSeconds(end);
    if (startSeconds !== null && endSeconds !== null && endSeconds > startSeconds) {
      return { start, end, source: candidate.source };
    }
  }

  return { start: null, end: null, source: 'cleared' };
}

function slugCode(value: unknown, fallback: string, max = 30): string {
  const cleaned = cleanText(value, 200)
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, max);
  return cleaned || fallback;
}

function inferClassNumeric(className: string): number | null {
  const match = className.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function inferEducationStage(classNumeric: number | null): string | null {
  if (classNumeric === null) return null;
  if (classNumeric <= 5) return 'Primary';
  if (classNumeric <= 8) return 'Upper Primary';
  if (classNumeric <= 10) return 'Secondary';
  return 'Higher Secondary';
}

function inferLanguageCode(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  const map: Record<string, string> = {
    english: 'en', hindi: 'hi', urdu: 'ur', marathi: 'mr', gujarati: 'gu',
    bengali: 'bn', punjabi: 'pa', tamil: 'ta', telugu: 'te', kannada: 'kn',
    malayalam: 'ml', odia: 'or', assamese: 'as', sanskrit: 'sa', sindhi: 'sd',
    kashmiri: 'ks', konkani: 'kok', nepali: 'ne', maithili: 'mai', dogri: 'doi',
    bodo: 'brx', manipuri: 'mni', santali: 'sat'
  };
  return map[normalized] || null;
}

async function must<T>(promise: PromiseLike<{ data: T; error: any }>, fallbackMessage: string): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message || fallbackMessage);
  return data;
}

async function maybeSingle(db: SupabaseClient, table: string, select: string, schoolId: string): Promise<any | null> {
  const { data, error } = await db.from(table).select(select).eq('school_id', schoolId).maybeSingle();
  if (error) throw new Error(error.message || `${table} could not be loaded.`);
  return data || null;
}

function metadataLegacyId(row: any): string | null {
  return cleanText(row?.metadata?.legacy_id || row?.metadata?.legacyId, 100) || null;
}

function rowMatchesLegacy(row: any, legacyId: unknown): boolean {
  const id = cleanText(legacyId, 100);
  return Boolean(id && metadataLegacyId(row) === id);
}

async function auditAcademicChange(
  db: SupabaseClient,
  schoolId: string,
  actorUserId: string,
  action: string,
  summary: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.from('audit_logs').insert({
      school_id: schoolId,
      actor_user_id: actorUserId,
      actor_kind: 'school_user',
      action,
      entity_type: 'academic_setup',
      entity_id: schoolId,
      summary,
      metadata
    });
  } catch {
    // The academic change remains authoritative even if audit persistence is temporarily unavailable.
  }
}

export type AcademicSetupCloudState = {
  initialized: boolean;
  source: 'cloud' | 'empty';
  summary: Record<string, number | boolean | string | null>;
  setup: any | null;
};

export async function loadAcademicSetupCloud(db: SupabaseClient, schoolId: string): Promise<AcademicSetupCloudState> {
  const [
    schoolResult,
    extensionResult,
    settingsResult,
    yearsResult,
    boardsResult,
    mediumsResult,
    classesResult,
    divisionsResult,
    mappingsResult,
    groupsResult,
    groupMembersResult,
    termsResult,
    gradeResult,
    scheduleResult,
    periodsResult,
    holidaysResult,
    documentsResult,
    printResult,
    subjectsResult,
    importsResult
  ] = await Promise.all([
    db.from('schools').select('id, school_name, school_code, address, phone_number, email').eq('id', schoolId).single(),
    db.from('school_profile_extensions').select('*').eq('school_id', schoolId).maybeSingle(),
    db.from('school_academic_settings').select('*').eq('school_id', schoolId).maybeSingle(),
    db.from('school_academic_years').select('*').eq('school_id', schoolId).order('sort_order').order('year_code'),
    db.from('school_boards').select('*').eq('school_id', schoolId).order('sort_order').order('board_name'),
    db.from('school_mediums').select('*, languages(language_code)').eq('school_id', schoolId).order('sort_order').order('medium_name'),
    db.from('school_classes').select('*').eq('school_id', schoolId).order('sort_order').order('class_numeric'),
    db.from('school_divisions').select('*').eq('school_id', schoolId).order('sort_order').order('division_name'),
    db.from('school_subject_mappings').select('*').eq('school_id', schoolId).order('print_order'),
    db.from('school_subject_groups').select('*').eq('school_id', schoolId).order('sort_order').order('group_name'),
    db.from('school_subject_group_members').select('*').eq('school_id', schoolId).order('sort_order'),
    db.from('school_academic_terms').select('*').eq('school_id', schoolId).order('sort_order').order('term_name'),
    db.from('school_grade_scales').select('*').eq('school_id', schoolId).order('system_group').order('sort_order'),
    db.from('school_day_schedules').select('*').eq('school_id', schoolId).order('weekday'),
    db.from('school_periods').select('*').eq('school_id', schoolId).order('sort_order').order('period_number'),
    db.from('school_holidays').select('*').eq('school_id', schoolId).order('starts_on'),
    db.from('school_document_requirements').select('*').eq('school_id', schoolId).order('sort_order').order('document_name'),
    db.from('school_print_settings').select('*').eq('school_id', schoolId).maybeSingle(),
    db.from('subjects').select('id, subject_name, subject_code, subject_type, is_active').eq('school_id', schoolId).order('subject_name'),
    db.from('school_academic_imports').select('*').eq('school_id', schoolId).order('imported_at', { ascending: false }).limit(5)
  ]);

  const allResults = [schoolResult, extensionResult, settingsResult, yearsResult, boardsResult, mediumsResult, classesResult, divisionsResult, mappingsResult, groupsResult, groupMembersResult, termsResult, gradeResult, scheduleResult, periodsResult, holidaysResult, documentsResult, printResult, subjectsResult, importsResult];
  const firstError = allResults.find((result: any) => result.error)?.error;
  if (firstError) throw new Error(firstError.message || 'Academic setup could not be loaded from the cloud.');

  const school: any = schoolResult.data;
  const extension: any = extensionResult.data || {};
  const settings: any = settingsResult.data || {};
  const years: any[] = yearsResult.data || [];
  const boards: any[] = boardsResult.data || [];
  const mediums: any[] = mediumsResult.data || [];
  const classes: any[] = classesResult.data || [];
  const divisions: any[] = divisionsResult.data || [];
  const mappings: any[] = mappingsResult.data || [];
  const groups: any[] = groupsResult.data || [];
  const groupMembers: any[] = groupMembersResult.data || [];
  const terms: any[] = termsResult.data || [];
  const grades: any[] = gradeResult.data || [];
  const schedules: any[] = scheduleResult.data || [];
  const periods: any[] = periodsResult.data || [];
  const holidays: any[] = holidaysResult.data || [];
  const documents: any[] = documentsResult.data || [];
  const print: any = printResult.data || null;
  const subjects: any[] = subjectsResult.data || [];
  const imports: any[] = importsResult.data || [];

  const completedImport = imports.some(item => item.status === 'completed');
  const initialized = completedImport;
  const summary = {
    schoolId,
    academicYears: years.length,
    boards: boards.length,
    mediums: mediums.length,
    classes: classes.length,
    divisions: divisions.length,
    subjects: subjects.length,
    subjectMappings: mappings.length,
    subjectGroups: groups.length,
    terms: terms.length,
    grades: grades.length,
    schedules: schedules.length,
    periods: periods.length,
    holidays: holidays.length,
    documents: documents.length,
    initialized,
    completedImport,
    partialCloudRows: !completedImport && (years.length > 0 || classes.length > 0 || boards.length > 0 || mediums.length > 0)
  };

  if (!initialized) return { initialized: false, source: 'empty', summary, setup: null };

  const classById = new Map(classes.map(row => [row.id, row]));
  const boardById = new Map(boards.map(row => [row.id, row]));
  const mappingsBySubject = new Map<string, any[]>();
  for (const mapping of mappings) {
    const current = mappingsBySubject.get(mapping.subject_id) || [];
    current.push(mapping);
    mappingsBySubject.set(mapping.subject_id, current);
  }

  const subjectItems = subjects.map(subject => {
    const subjectMappings = mappingsBySubject.get(subject.id) || [];
    const classMapping = Array.from(new Set(subjectMappings.map(item => classById.get(item.class_id)?.class_name).filter(Boolean)));
    const boardMapping = Array.from(new Set(subjectMappings.flatMap(item => Array.isArray(item.metadata?.board_ids) ? item.metadata.board_ids : [item.board_id]).filter(Boolean)));
    const first = subjectMappings[0] || {};
    const meta = first.metadata || {};
    return {
      id: subject.id,
      subjectCode: subject.subject_code || '',
      subjectName: subject.subject_name || '',
      subjectType: subject.subject_type || 'Core',
      language: meta.subject_language || (String(subject.subject_type || '').toLowerCase() === 'language' ? subject.subject_name : 'None'),
      isScholastic: meta.is_scholastic !== false,
      boardMapping,
      classMapping,
      maxMarks: safeNumber(first.max_marks, 100),
      passingMarks: safeNumber(first.passing_marks, 35),
      printOrder: safeNumber(first.print_order, 0),
      isActive: subject.is_active !== false
    };
  });

  const groupMemberMap = new Map<string, string[]>();
  for (const member of groupMembers) {
    const current = groupMemberMap.get(member.group_id) || [];
    current.push(member.subject_id);
    groupMemberMap.set(member.group_id, current);
  }

  const activeYear = years.find(row => row.is_active) || years[0] || null;
  const activeYearId = settings.active_academic_year_id || activeYear?.id || '';
  const activeSchedules = schedules.filter(row => !row.academic_year_id || row.academic_year_id === activeYearId);
  const firstWorkingSchedule = activeSchedules.find(row => row.is_working_day) || activeSchedules[0] || {};
  const dayOverrides: Record<string, any> = {};
  for (const row of activeSchedules) {
    const day = DAY_NAMES[Number(row.weekday)] || String(row.day_label || 'Day');
    dayOverrides[day] = {
      classification: row.classification || 'Standard',
      isWorkingDay: row.is_working_day !== false,
      openingTime: to12Hour(row.opening_time, '08:00 AM'),
      closingTime: to12Hour(row.closing_time, '01:30 PM'),
      prayerTime: to12Hour(row.prayer_time, '08:15 AM'),
      lunchBreakStart: to12Hour(row.lunch_break_start, '11:00 AM'),
      lunchBreakEnd: to12Hour(row.lunch_break_end, '11:30 AM'),
      shortBreakStart: to12Hour(row.short_break_start, ''),
      shortBreakEnd: to12Hour(row.short_break_end, ''),
      notes: row.notes || ''
    };
  }

  const defaultLanguage = cleanText(settings.configuration?.defaultLanguage, 20) || 'en';
  const setup = {
    schoolProfile: {
      schoolName: school.school_name || '',
      managementName: extension.management_name || '',
      udiseCode: extension.udise_code || '',
      schoolCode: school.school_code || '',
      address: extension.address_line || school.address || '',
      villageCity: extension.village_city || '',
      taluka: extension.taluka || '',
      district: extension.district || '',
      state: extension.state || '',
      pinCode: extension.pin_code || '',
      phoneNumbers: school.phone_number || '',
      whatsAppNumber: extension.whatsapp_number || '',
      email: school.email || '',
      website: extension.website || '',
      principalName: extension.principal_name || '',
      schoolLogo: extension.school_logo_url || '',
      schoolSeal: extension.school_seal_url || '',
      principalSignature: extension.principal_signature_url || '',
      headmasterSignature: extension.headmaster_signature_url || '',
      clerkSignature: extension.clerk_signature_url || '',
      schoolBuildingPhoto: extension.school_building_photo_url || '',
      primaryMedium: extension.primary_medium_label || '',
      secondaryMedium: extension.secondary_medium_label || '',
      regNumber: extension.registration_number || ''
    },
    academicYears: years.map(row => ({ id: row.id, year: row.year_code, isActive: row.is_active === true, isLocked: row.is_locked === true })),
    classes: classes.map(row => ({ id: row.id, className: row.class_name, isEnabled: row.is_active !== false })),
    divisions: divisions.map(row => ({ id: row.id, divisionName: row.division_name, isEnabled: row.is_active !== false })),
    mediums: mediums.map(row => ({ id: row.id, mediumName: row.medium_name, isEnabled: row.is_active !== false })),
    subjects: subjectItems,
    subjectGroups: groups.map(row => ({ id: row.id, groupName: row.group_name, subjectIds: groupMemberMap.get(row.id) || [], groupCode: row.group_code || '', combinedPaperEnabled: String(row.group_code || '').toUpperCase().startsWith('CQP_') })),
    boards: boards.map(row => ({ id: row.id, boardName: row.board_name, isDefault: row.is_default === true, isEnabled: row.is_active !== false })),
    examTerms: terms.map(row => ({ id: row.id, termName: row.term_name, maxMarksWeightage: safeNumber(row.weightage, 100), isActive: row.is_active !== false })),
    gradeScales: grades.map(row => ({
      id: row.id,
      gradeName: row.grade_name,
      minPercentage: safeNumber(row.min_percentage),
      maxPercentage: safeNumber(row.max_percentage, 100),
      gradePoints: safeNumber(row.grade_points),
      remarks: row.remarks || '',
      systemGroup: row.system_group || 'secondary'
    })),
    schoolTiming: {
      openingTime: to12Hour(firstWorkingSchedule.opening_time, '08:00 AM'),
      closingTime: to12Hour(firstWorkingSchedule.closing_time, '01:30 PM'),
      prayerTime: to12Hour(firstWorkingSchedule.prayer_time, '08:15 AM'),
      lunchBreakStart: to12Hour(firstWorkingSchedule.lunch_break_start, '11:00 AM'),
      lunchBreakEnd: to12Hour(firstWorkingSchedule.lunch_break_end, '11:30 AM'),
      shortBreakStart: to12Hour(firstWorkingSchedule.short_break_start, ''),
      shortBreakEnd: to12Hour(firstWorkingSchedule.short_break_end, ''),
      workingDays: activeSchedules.filter(row => row.is_working_day).map(row => DAY_NAMES[Number(row.weekday)]).filter(Boolean),
      holidayRules: settings.configuration?.holidayRules || '',
      dayOverrides
    },
    periods: periods.filter(row => !row.academic_year_id || row.academic_year_id === activeYearId).map(row => ({
      id: row.id,
      periodName: row.period_name,
      periodNumber: safeNumber(row.metadata?.legacy_period_number, safeNumber(row.period_number)),
      startTime: to12Hour(row.starts_at),
      endTime: to12Hour(row.ends_at),
      durationMinutes: safeNumber(row.duration_minutes),
      type: row.period_type || 'Lecture'
    })),
    holidays: holidays.filter(row => !row.academic_year_id || row.academic_year_id === activeYearId).map(row => ({
      id: row.id,
      holidayName: row.holiday_name,
      startDate: row.starts_on,
      endDate: row.ends_on,
      holidayType: row.holiday_type || 'School',
      description: row.description || ''
    })),
    documents: documents.map(row => ({ id: row.id, documentName: row.document_name, isRequired: row.is_required !== false, description: row.description || '' })),
    printSettings: {
      paperSize: print?.paper_size || 'A4',
      orientation: print?.orientation || 'Portrait',
      marginTop: safeNumber(print?.margin_top_mm, 10),
      marginBottom: safeNumber(print?.margin_bottom_mm, 10),
      marginLeft: safeNumber(print?.margin_left_mm, 10),
      marginRight: safeNumber(print?.margin_right_mm, 10),
      showHeader: print?.show_header !== false,
      showFooter: print?.show_footer !== false,
      logoPosition: print?.logo_position || 'Left',
      watermarkText: print?.watermark_text || '',
      enableQRCode: print?.enable_qr_code === true
    },
    globalSettings: {
      defaultLanguage,
      defaultAcademicYearId: activeYearId,
      defaultBoardId: settings.default_board_id || boards.find(row => row.is_default)?.id || '',
      defaultMediumId: settings.default_medium_id || mediums.find(row => row.is_default)?.id || '',
      defaultClassId: settings.default_class_id || '',
      defaultTimeZone: settings.timezone || 'Asia/Kolkata',
      dateFormat: settings.date_format || 'DD/MM/YYYY',
      timeFormat: settings.time_format || '12h',
      currency: settings.currency || 'INR',
      registrationMode: settings.registration_mode || 'self_approval',
      parentApprovalRequired: settings.parent_approval_required !== false
    }
  };

  return { initialized: true, source: 'cloud', summary, setup };
}

type SyncMode = 'import' | 'update';

async function loadLanguageId(db: SupabaseClient, mediumName: string): Promise<string | null> {
  const code = inferLanguageCode(mediumName);
  if (!code) return null;
  const { data, error } = await db.from('languages').select('id').eq('language_code', code).eq('is_active', true).maybeSingle();
  if (error) return null;
  return data?.id || null;
}

async function upsertNamedRows(
  db: SupabaseClient,
  table: string,
  schoolId: string,
  incoming: any[],
  nameColumn: string,
  payloadFactory: (item: any, index: number) => Promise<Record<string, any>> | Record<string, any>,
  inactiveColumn = 'is_active'
): Promise<Map<string, string>> {
  const { data: existing, error } = await db.from(table).select('*').eq('school_id', schoolId);
  if (error) throw new Error(error.message || `${table} could not be loaded for saving.`);
  const rows: any[] = existing || [];
  const result = new Map<string, string>();
  const touchedIds = new Set<string>();

  for (let index = 0; index < incoming.length; index += 1) {
    const item = incoming[index];
    const legacyId = cleanText(item?.id, 100);
    const name = cleanText(item?.name ?? item?.[nameColumn] ?? item?.year ?? item?.className ?? item?.divisionName ?? item?.mediumName ?? item?.boardName ?? item?.groupName ?? item?.termName ?? item?.gradeName ?? item?.documentName, 200);
    if (!name) continue;
    const explicitId = validUuid(legacyId);
    const match = rows.find(row => explicitId && row.id === explicitId)
      || rows.find(row => rowMatchesLegacy(row, legacyId))
      || rows.find(row => cleanText(row[nameColumn], 200).toLowerCase() === name.toLowerCase());
    const payload = await payloadFactory(item, index);
    payload.school_id = schoolId;
    payload[nameColumn] = name;
    payload.updated_at = new Date().toISOString();
    payload.metadata = { ...(match?.metadata || {}), ...(payload.metadata || {}), legacy_id: legacyId || match?.metadata?.legacy_id || null, source: 'academic_setup_cloud' };

    if (match?.id) {
      const { data, error: updateError } = await db.from(table).update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
      if (updateError) throw new Error(updateError.message || `${name} could not be updated.`);
      touchedIds.add(data.id);
      result.set(legacyId || data.id, data.id);
    } else {
      const { data, error: insertError } = await db.from(table).insert(payload).select('id').single();
      if (insertError) throw new Error(insertError.message || `${name} could not be created.`);
      rows.push({ id: data.id, ...payload });
      touchedIds.add(data.id);
      result.set(legacyId || data.id, data.id);
    }
  }

  if (inactiveColumn && rows.length) {
    const staleIds = rows.filter(row => !touchedIds.has(row.id) && row.metadata?.source === 'academic_setup_cloud').map(row => row.id);
    if (staleIds.length) {
      const { error: staleError } = await db.from(table).update({ [inactiveColumn]: false, updated_at: new Date().toISOString() }).eq('school_id', schoolId).in('id', staleIds);
      if (staleError) throw new Error(staleError.message || `${table} stale rows could not be deactivated.`);
    }
  }

  return result;
}

async function resolveMappedId(map: Map<string, string>, sourceId: unknown, fallbackRows: any[], fallbackName?: string): Promise<string | null> {
  const raw = cleanText(sourceId, 100);
  if (map.has(raw)) return map.get(raw) || null;
  const uuid = validUuid(raw);
  if (uuid) return uuid;
  if (fallbackName) {
    const row = fallbackRows.find(item => cleanText(item.name || item.className || item.boardName || item.mediumName || item.year || item.subjectName, 200).toLowerCase() === fallbackName.toLowerCase());
    if (row) return map.get(cleanText(row.id, 100)) || validUuid(row.id);
  }
  return null;
}

export async function syncAcademicSetupCloud(
  db: SupabaseClient,
  schoolId: string,
  actorUserId: string,
  setup: any,
  mode: SyncMode,
  auditAction = 'ACADEMIC_SETUP_SYNC',
  auditDetail = 'Academic setup synchronized to the cloud.'
): Promise<AcademicSetupCloudState> {
  if (!setup || typeof setup !== 'object') throw new Error('Academic setup payload is missing.');
  const now = new Date().toISOString();
  const profile = setup.schoolProfile || {};

  if (mode === 'update') {
    const schoolName = cleanText(profile.schoolName, 250);
    const schoolCode = cleanText(profile.schoolCode, 50).toUpperCase();
    if (!schoolName || !schoolCode) throw new Error('School name and school code are required.');
    const { error: schoolError } = await db.from('schools').update({
      school_name: schoolName,
      school_code: schoolCode,
      address: nullableText([profile.address, profile.villageCity, profile.taluka, profile.district, profile.state, profile.pinCode].filter(Boolean).join(', '), 1000),
      phone_number: nullableText(profile.phoneNumbers, 50),
      email: nullableText(cleanText(profile.email, 250).toLowerCase(), 250),
      updated_at: now
    }).eq('id', schoolId);
    if (schoolError) throw new Error(schoolError.message || 'School profile could not be updated.');
  }

  const extensionPayload = {
    school_id: schoolId,
    management_name: nullableText(profile.managementName, 250),
    udise_code: nullableText(profile.udiseCode, 30),
    registration_number: nullableText(profile.regNumber, 100),
    address_line: nullableText(profile.address, 1000),
    village_city: nullableText(profile.villageCity, 200),
    taluka: nullableText(profile.taluka, 200),
    district: nullableText(profile.district, 200),
    state: nullableText(profile.state, 200),
    pin_code: nullableText(profile.pinCode, 12),
    whatsapp_number: nullableText(profile.whatsAppNumber, 50),
    website: nullableText(profile.website, 500),
    principal_name: nullableText(profile.principalName, 250),
    school_logo_url: nullableText(profile.schoolLogo, 500000),
    school_seal_url: nullableText(profile.schoolSeal, 500000),
    principal_signature_url: nullableText(profile.principalSignature, 500000),
    headmaster_signature_url: nullableText(profile.headmasterSignature, 500000),
    clerk_signature_url: nullableText(profile.clerkSignature, 500000),
    school_building_photo_url: nullableText(profile.schoolBuildingPhoto, 500000),
    primary_medium_label: nullableText(profile.primaryMedium, 250),
    secondary_medium_label: nullableText(profile.secondaryMedium, 250),
    metadata: { source: 'academic_setup_cloud' },
    updated_by: actorUserId,
    updated_at: now
  };
  const { data: existingExtension, error: extensionCheckError } = await db.from('school_profile_extensions').select('school_id').eq('school_id', schoolId).maybeSingle();
  if (extensionCheckError) throw new Error(extensionCheckError.message || 'School profile extension could not be checked.');
  const extensionWrite = existingExtension
    ? await db.from('school_profile_extensions').update(extensionPayload).eq('school_id', schoolId)
    : await db.from('school_profile_extensions').insert({ ...extensionPayload, created_by: actorUserId });
  if (extensionWrite.error) throw new Error(extensionWrite.error.message || 'School profile extension could not be saved.');

  const academicYears = arrayOf<any>(setup.academicYears);
  if (!academicYears.length) throw new Error('At least one academic year is required.');
  const activeIncoming = academicYears.find(item => item?.isActive) || academicYears[0];
  await must(db.from('school_academic_years').update({ is_active: false, updated_at: now }).eq('school_id', schoolId), 'Academic year state could not be prepared.');
  const yearMap = await upsertNamedRows(db, 'school_academic_years', schoolId, academicYears, 'year_code', (item, index) => ({
    starts_on: nullableText(item.startsOn, 20),
    ends_on: nullableText(item.endsOn, 20),
    is_active: cleanText(item.id, 100) === cleanText(activeIncoming?.id, 100),
    is_locked: item.isLocked === true,
    lock_reason: nullableText(item.lockReason, 500),
    sort_order: index * 10,
    updated_by: actorUserId,
    created_by: actorUserId
  }), 'is_active');
  const activeYearId = yearMap.get(cleanText(activeIncoming?.id, 100)) || null;
  if (!activeYearId) throw new Error('Active academic year could not be resolved.');

  await must(db.from('school_boards').update({ is_default: false, updated_at: now }).eq('school_id', schoolId), 'Board defaults could not be prepared.');
  const boards = arrayOf<any>(setup.boards);
  const boardMap = await upsertNamedRows(db, 'school_boards', schoolId, boards, 'board_name', (item, index) => ({
    board_code: nullableText(item.boardCode || slugCode(item.boardName, `BOARD${index + 1}`), 30),
    is_default: item.isDefault === true,
    is_active: item.isEnabled !== false,
    sort_order: index * 10,
    updated_by: actorUserId,
    created_by: actorUserId
  }));

  await must(db.from('school_mediums').update({ is_default: false, updated_at: now }).eq('school_id', schoolId), 'Medium defaults could not be prepared.');
  const mediums = arrayOf<any>(setup.mediums);
  const defaultMediumLegacyId = cleanText(setup.globalSettings?.defaultMediumId, 100);
  const mediumMap = await upsertNamedRows(db, 'school_mediums', schoolId, mediums, 'medium_name', async (item, index) => ({
    language_id: await loadLanguageId(db, cleanText(item.mediumName, 100)),
    is_default: cleanText(item.id, 100) === defaultMediumLegacyId || (!defaultMediumLegacyId && index === 0),
    is_active: item.isEnabled !== false,
    sort_order: index * 10,
    updated_by: actorUserId,
    created_by: actorUserId
  }));

  const classes = arrayOf<any>(setup.classes);
  const classMap = await upsertNamedRows(db, 'school_classes', schoolId, classes, 'class_name', (item, index) => {
    const numeric = inferClassNumeric(cleanText(item.className, 100));
    return {
      class_code: nullableText(item.classCode || slugCode(item.className, `CLASS${index + 1}`), 30),
      class_numeric: numeric,
      education_stage: inferEducationStage(numeric),
      is_active: item.isEnabled !== false,
      sort_order: numeric !== null ? Math.round(numeric * 10) : index * 10,
      updated_by: actorUserId,
      created_by: actorUserId
    };
  });

  const divisions = arrayOf<any>(setup.divisions);
  const divisionMap = await upsertNamedRows(db, 'school_divisions', schoolId, divisions, 'division_name', (item, index) => ({
    division_code: nullableText(item.divisionCode || slugCode(item.divisionName, `DIV${index + 1}`), 30),
    is_no_division: cleanText(item.divisionName, 100).toLowerCase() === 'no division',
    is_active: item.isEnabled !== false,
    sort_order: index * 10,
    updated_by: actorUserId,
    created_by: actorUserId
  }));

  const { data: existingSubjects, error: subjectLoadError } = await db.from('subjects').select('id, subject_name, subject_code, subject_type, is_active').eq('school_id', schoolId);
  if (subjectLoadError) throw new Error(subjectLoadError.message || 'Subjects could not be loaded for synchronization.');
  const subjectRows: any[] = existingSubjects || [];
  const subjectMap = new Map<string, string>();
  for (let index = 0; index < arrayOf<any>(setup.subjects).length; index += 1) {
    const item = arrayOf<any>(setup.subjects)[index];
    const legacyId = cleanText(item.id, 100);
    const name = cleanText(item.subjectName, 150);
    const code = cleanText(item.subjectCode, 30).toUpperCase() || slugCode(name, `SUB${index + 1}`);
    if (!name) continue;
    const explicitId = validUuid(legacyId);
    const match = subjectRows.find(row => explicitId && row.id === explicitId)
      || subjectRows.find(row => cleanText(row.subject_code, 30).toUpperCase() === code)
      || subjectRows.find(row => cleanText(row.subject_name, 150).toLowerCase() === name.toLowerCase());
    const payload = {
      subject_name: name,
      subject_code: code,
      subject_type: cleanText(item.subjectType, 100) || 'Core',
      is_active: item.isActive !== false,
      updated_at: now
    };
    if (match?.id) {
      if (mode === 'update') {
        const { data, error } = await db.from('subjects').update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
        if (error) throw new Error(error.message || `${name} could not be updated.`);
        subjectMap.set(legacyId || data.id, data.id);
      } else {
        // Initial import never overwrites an existing live Subject Master row.
        subjectMap.set(legacyId || match.id, match.id);
      }
    } else {
      const { data, error } = await db.from('subjects').insert({ school_id: schoolId, ...payload }).select('id').single();
      if (error) throw new Error(error.message || `${name} could not be created.`);
      subjectRows.push({ id: data.id, ...payload });
      subjectMap.set(legacyId || data.id, data.id);
    }
  }

  const incomingMappingKeys = new Set<string>();
  const { data: existingMappings, error: mappingLoadError } = await db.from('school_subject_mappings').select('*').eq('school_id', schoolId).eq('academic_year_id', activeYearId);
  if (mappingLoadError) throw new Error(mappingLoadError.message || 'Subject mappings could not be loaded.');
  const currentMappings: any[] = existingMappings || [];
  const subjects = arrayOf<any>(setup.subjects);
  for (const subject of subjects) {
    const subjectId = subjectMap.get(cleanText(subject.id, 100)) || validUuid(subject.id);
    if (!subjectId) continue;
    const classNames = arrayOf<string>(subject.classMapping);
    const boardIds = arrayOf<string>(subject.boardMapping);
    const resolvedBoardIds = boardIds.map(id => boardMap.get(cleanText(id, 100)) || validUuid(id)).filter(Boolean) as string[];
    const resolvedBoardId = resolvedBoardIds[0] || null;
    for (const className of classNames) {
      const classItem = classes.find(item => cleanText(item.className, 100).toLowerCase() === cleanText(className, 100).toLowerCase());
      const classId = classItem ? classMap.get(cleanText(classItem.id, 100)) : null;
      if (!classId) continue;
      const key = `${activeYearId}:${classId}:${subjectId}`;
      incomingMappingKeys.add(key);
      const match = currentMappings.find(row => row.class_id === classId && row.subject_id === subjectId && !row.division_id && !row.medium_id);
      const payload = {
        school_id: schoolId,
        academic_year_id: activeYearId,
        class_id: classId,
        division_id: null,
        medium_id: null,
        board_id: resolvedBoardId,
        subject_id: subjectId,
        max_marks: safeNumber(subject.maxMarks, 100),
        passing_marks: safeNumber(subject.passingMarks, 35),
        weekly_periods: subject.weeklyPeriods == null ? null : safeNumber(subject.weeklyPeriods),
        print_order: safeNumber(subject.printOrder),
        is_compulsory: subject.isCompulsory !== false,
        is_active: subject.isActive !== false,
        metadata: {
          source: 'academic_setup_cloud',
          legacy_subject_id: cleanText(subject.id, 100),
          subject_language: cleanText(subject.language, 100) || 'None',
          is_scholastic: subject.isScholastic !== false,
          board_ids: resolvedBoardIds
        },
        updated_by: actorUserId,
        updated_at: now
      };
      if (match?.id) {
        const { error } = await db.from('school_subject_mappings').update(payload).eq('id', match.id).eq('school_id', schoolId);
        if (error) throw new Error(error.message || 'Subject mapping could not be updated.');
      } else {
        const { error } = await db.from('school_subject_mappings').insert({ ...payload, created_by: actorUserId });
        if (error) throw new Error(error.message || 'Subject mapping could not be created.');
      }
    }
  }
  const staleMappingIds = currentMappings.filter(row => row.metadata?.source === 'academic_setup_cloud' && !incomingMappingKeys.has(`${row.academic_year_id}:${row.class_id}:${row.subject_id}`)).map(row => row.id);
  if (staleMappingIds.length) {
    const { error } = await db.from('school_subject_mappings').update({ is_active: false, updated_at: now, updated_by: actorUserId }).eq('school_id', schoolId).in('id', staleMappingIds);
    if (error) throw new Error(error.message || 'Stale subject mappings could not be deactivated.');
  }

  const groups = arrayOf<any>(setup.subjectGroups);
  const groupMap = await upsertNamedRows(db, 'school_subject_groups', schoolId, groups, 'group_name', (item, index) => ({
    group_code: nullableText(item.combinedPaperEnabled
      ? `CQP_${slugCode(item.groupName, `GROUP${index + 1}`)}`.slice(0, 30)
      : (item.groupCode || slugCode(item.groupName, `GROUP${index + 1}`)), 30),
    is_active: true,
    sort_order: index * 10,
    updated_by: actorUserId,
    created_by: actorUserId
  }));
  for (const group of groups) {
    const groupId = groupMap.get(cleanText(group.id, 100));
    if (!groupId) continue;
    const desiredSubjectIds = arrayOf<string>(group.subjectIds).map(id => subjectMap.get(cleanText(id, 100)) || validUuid(id)).filter(Boolean) as string[];
    const { data: existingMembers, error: memberLoadError } = await db.from('school_subject_group_members').select('id, subject_id').eq('school_id', schoolId).eq('group_id', groupId);
    if (memberLoadError) throw new Error(memberLoadError.message || 'Subject group members could not be loaded.');
    const existingBySubject = new Map((existingMembers || []).map((row: any) => [row.subject_id, row]));
    for (let index = 0; index < desiredSubjectIds.length; index += 1) {
      const subjectId = desiredSubjectIds[index];
      if (existingBySubject.has(subjectId)) continue;
      const { error } = await db.from('school_subject_group_members').insert({ school_id: schoolId, group_id: groupId, subject_id: subjectId, sort_order: index * 10, created_by: actorUserId });
      if (error) throw new Error(error.message || 'Subject group member could not be added.');
    }
    const staleMembers = (existingMembers || []).filter((row: any) => !desiredSubjectIds.includes(row.subject_id)).map((row: any) => row.id);
    if (staleMembers.length) {
      const { error } = await db.from('school_subject_group_members').delete().eq('school_id', schoolId).eq('group_id', groupId).in('id', staleMembers);
      if (error) throw new Error(error.message || 'Subject group member could not be removed.');
    }
  }

  const terms = arrayOf<any>(setup.examTerms);
  await upsertNamedRows(db, 'school_academic_terms', schoolId, terms, 'term_name', (item, index) => ({
    academic_year_id: activeYearId,
    term_code: nullableText(item.termCode || slugCode(item.termName, `TERM${index + 1}`), 30),
    starts_on: nullableText(item.startsOn, 20),
    ends_on: nullableText(item.endsOn, 20),
    weightage: safeNumber(item.maxMarksWeightage, 100),
    is_active: item.isActive !== false,
    sort_order: index * 10,
    updated_by: actorUserId,
    created_by: actorUserId
  }));

  const grades = arrayOf<any>(setup.gradeScales);
  const { data: existingGrades, error: gradeLoadError } = await db.from('school_grade_scales').select('*').eq('school_id', schoolId).eq('academic_year_id', activeYearId);
  if (gradeLoadError) throw new Error(gradeLoadError.message || 'Grade scales could not be loaded.');
  const touchedGradeIds = new Set<string>();
  for (let index = 0; index < grades.length; index += 1) {
    const grade = grades[index];
    const explicitId = validUuid(grade.id);
    const group = ['primary', 'secondary', 'future_ready', 'custom'].includes(grade.systemGroup) ? grade.systemGroup : 'secondary';
    const name = cleanText(grade.gradeName, 30).toUpperCase();
    if (!name) continue;
    const match = (existingGrades || []).find((row: any) => explicitId && row.id === explicitId)
      || (existingGrades || []).find((row: any) => row.system_group === group && cleanText(row.grade_name, 30).toLowerCase() === name.toLowerCase());
    const payload = {
      school_id: schoolId,
      academic_year_id: activeYearId,
      system_group: group,
      grade_name: name,
      min_percentage: safeNumber(grade.minPercentage),
      max_percentage: safeNumber(grade.maxPercentage, 100),
      grade_points: safeNumber(grade.gradePoints),
      remarks: nullableText(grade.remarks, 500),
      is_active: true,
      sort_order: index * 10,
      metadata: { source: 'academic_setup_cloud', legacy_id: cleanText(grade.id, 100) },
      updated_by: actorUserId,
      updated_at: now
    };
    if (match?.id) {
      const { data, error } = await db.from('school_grade_scales').update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
      if (error) throw new Error(error.message || 'Grade scale could not be updated.');
      touchedGradeIds.add(data.id);
    } else {
      const { data, error } = await db.from('school_grade_scales').insert({ ...payload, created_by: actorUserId }).select('id').single();
      if (error) throw new Error(error.message || 'Grade scale could not be created.');
      touchedGradeIds.add(data.id);
    }
  }
  const staleGradeIds = (existingGrades || []).filter((row: any) => row.metadata?.source === 'academic_setup_cloud' && !touchedGradeIds.has(row.id)).map((row: any) => row.id);
  if (staleGradeIds.length) {
    const { error } = await db.from('school_grade_scales').delete().eq('school_id', schoolId).in('id', staleGradeIds);
    if (error) throw new Error(error.message || 'Removed grade scales could not be deleted.');
  }

  const timing = setup.schoolTiming || {};
  const dayOverrides = timing.dayOverrides && typeof timing.dayOverrides === 'object' ? timing.dayOverrides : {};
  const workingDays = new Set(arrayOf<string>(timing.workingDays));
  const { data: existingSchedules, error: scheduleLoadError } = await db.from('school_day_schedules').select('*').eq('school_id', schoolId).eq('academic_year_id', activeYearId);
  if (scheduleLoadError) throw new Error(scheduleLoadError.message || 'School day schedules could not be loaded.');
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const dayName = DAY_NAMES[weekday];
    const override = dayOverrides[dayName] || {};
    const isWorkingDay = override.isWorkingDay !== undefined ? override.isWorkingDay === true : workingDays.has(dayName);
    const schoolHours = isWorkingDay
      ? normalizeOrderedTimePair(override.openingTime, override.closingTime, timing.openingTime, timing.closingTime)
      : { start: null, end: null, source: 'cleared' as const };
    const lunchBreak = isWorkingDay
      ? normalizeOrderedTimePair(override.lunchBreakStart, override.lunchBreakEnd, timing.lunchBreakStart, timing.lunchBreakEnd)
      : { start: null, end: null, source: 'cleared' as const };
    const shortBreak = isWorkingDay
      ? normalizeOrderedTimePair(override.shortBreakStart, override.shortBreakEnd, timing.shortBreakStart, timing.shortBreakEnd)
      : { start: null, end: null, source: 'cleared' as const };

    const payload = {
      school_id: schoolId,
      academic_year_id: activeYearId,
      weekday,
      day_label: dayName,
      classification: nullableText(override.classification || (isWorkingDay ? 'Standard' : 'Holiday'), 100),
      is_working_day: isWorkingDay,
      opening_time: schoolHours.start,
      closing_time: schoolHours.end,
      prayer_time: isWorkingDay ? to24Hour(override.prayerTime || timing.prayerTime) : null,
      lunch_break_start: lunchBreak.start,
      lunch_break_end: lunchBreak.end,
      short_break_start: shortBreak.start,
      short_break_end: shortBreak.end,
      notes: nullableText(override.notes, 500),
      metadata: {
        source: 'academic_setup_cloud',
        time_pair_source: {
          school_hours: schoolHours.source,
          lunch_break: lunchBreak.source,
          short_break: shortBreak.source
        }
      },
      updated_by: actorUserId,
      updated_at: now
    };
    const match = (existingSchedules || []).find((row: any) => Number(row.weekday) === weekday);
    if (match?.id) {
      const { error } = await db.from('school_day_schedules').update(payload).eq('id', match.id).eq('school_id', schoolId);
      if (error) throw new Error(error.message || `${dayName} schedule could not be updated.`);
    } else {
      const { error } = await db.from('school_day_schedules').insert({ ...payload, created_by: actorUserId });
      if (error) throw new Error(error.message || `${dayName} schedule could not be created.`);
    }
  }

  const periodItems = arrayOf<any>(setup.periods);
  const { data: existingPeriods, error: periodLoadError } = await db.from('school_periods').select('*').eq('school_id', schoolId).eq('academic_year_id', activeYearId);
  if (periodLoadError) throw new Error(periodLoadError.message || 'Periods could not be loaded.');
  const touchedPeriodIds = new Set<string>();
  const usedDatabasePeriodNumbers = new Set<number>();
  for (let index = 0; index < periodItems.length; index += 1) {
    const period = periodItems[index];
    const explicitId = validUuid(period.id);
    const legacyNumber = Math.max(0, Math.trunc(safeNumber(period.periodNumber, index + 1)));
    let databaseNumber = legacyNumber;
    while (usedDatabasePeriodNumbers.has(databaseNumber)) databaseNumber = 1000 + index + usedDatabasePeriodNumbers.size;
    usedDatabasePeriodNumbers.add(databaseNumber);
    const match = (existingPeriods || []).find((row: any) => explicitId && row.id === explicitId)
      || (existingPeriods || []).find((row: any) => cleanText(row.metadata?.legacy_id, 100) === cleanText(period.id, 100))
      || (existingPeriods || []).find((row: any) => Number(row.period_number) === databaseNumber);
    const start = to24Hour(period.startTime);
    const end = to24Hour(period.endTime);
    if (!start || !end) continue;
    const payload = {
      school_id: schoolId,
      academic_year_id: activeYearId,
      period_name: cleanText(period.periodName, 100) || `Period ${legacyNumber}`,
      period_number: databaseNumber,
      starts_at: start,
      ends_at: end,
      duration_minutes: Math.max(1, Math.trunc(safeNumber(period.durationMinutes, 45))),
      period_type: ['Lecture', 'Break', 'Assembly', 'Sports', 'Library', 'Lab', 'Other'].includes(period.type) ? period.type : 'Other',
      is_active: true,
      sort_order: index * 10,
      metadata: { source: 'academic_setup_cloud', legacy_id: cleanText(period.id, 100), legacy_period_number: legacyNumber },
      updated_by: actorUserId,
      updated_at: now
    };
    if (match?.id) {
      const { data, error } = await db.from('school_periods').update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
      if (error) throw new Error(error.message || 'Period could not be updated.');
      touchedPeriodIds.add(data.id);
    } else {
      const { data, error } = await db.from('school_periods').insert({ ...payload, created_by: actorUserId }).select('id').single();
      if (error) throw new Error(error.message || 'Period could not be created.');
      touchedPeriodIds.add(data.id);
    }
  }
  const stalePeriodIds = (existingPeriods || []).filter((row: any) => row.metadata?.source === 'academic_setup_cloud' && !touchedPeriodIds.has(row.id)).map((row: any) => row.id);
  if (stalePeriodIds.length) {
    const { error } = await db.from('school_periods').delete().eq('school_id', schoolId).in('id', stalePeriodIds);
    if (error) throw new Error(error.message || 'Removed periods could not be deleted.');
  }

  const holidayItems = arrayOf<any>(setup.holidays);
  const { data: existingHolidays, error: holidayLoadError } = await db.from('school_holidays').select('*').eq('school_id', schoolId).eq('academic_year_id', activeYearId);
  if (holidayLoadError) throw new Error(holidayLoadError.message || 'Holidays could not be loaded.');
  const touchedHolidayIds = new Set<string>();
  for (const holiday of holidayItems) {
    const name = cleanText(holiday.holidayName, 200);
    const startsOn = cleanText(holiday.startDate, 20);
    const endsOn = cleanText(holiday.endDate || holiday.startDate, 20);
    if (!name || !startsOn || !endsOn) continue;
    const explicitId = validUuid(holiday.id);
    const match = (existingHolidays || []).find((row: any) => explicitId && row.id === explicitId)
      || (existingHolidays || []).find((row: any) => cleanText(row.holiday_name, 200).toLowerCase() === name.toLowerCase() && row.starts_on === startsOn);
    const payload = {
      school_id: schoolId,
      academic_year_id: activeYearId,
      holiday_name: name,
      starts_on: startsOn,
      ends_on: endsOn,
      holiday_type: ['National', 'State', 'School', 'Religious', 'Other'].includes(holiday.holidayType) ? holiday.holidayType : 'Other',
      description: nullableText(holiday.description, 1000),
      is_active: true,
      metadata: { source: 'academic_setup_cloud', legacy_id: cleanText(holiday.id, 100) },
      updated_by: actorUserId,
      updated_at: now
    };
    if (match?.id) {
      const { data, error } = await db.from('school_holidays').update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
      if (error) throw new Error(error.message || 'Holiday could not be updated.');
      touchedHolidayIds.add(data.id);
    } else {
      const { data, error } = await db.from('school_holidays').insert({ ...payload, created_by: actorUserId }).select('id').single();
      if (error) throw new Error(error.message || 'Holiday could not be created.');
      touchedHolidayIds.add(data.id);
    }
  }
  const staleHolidayIds = (existingHolidays || []).filter((row: any) => row.metadata?.source === 'academic_setup_cloud' && !touchedHolidayIds.has(row.id)).map((row: any) => row.id);
  if (staleHolidayIds.length) {
    const { error } = await db.from('school_holidays').delete().eq('school_id', schoolId).in('id', staleHolidayIds);
    if (error) throw new Error(error.message || 'Removed holidays could not be deleted.');
  }

  const documentItems = arrayOf<any>(setup.documents);
  const { data: existingDocuments, error: documentLoadError } = await db.from('school_document_requirements').select('*').eq('school_id', schoolId);
  if (documentLoadError) throw new Error(documentLoadError.message || 'Document requirements could not be loaded.');
  const touchedDocumentIds = new Set<string>();
  for (let index = 0; index < documentItems.length; index += 1) {
    const document = documentItems[index];
    const name = cleanText(document.documentName, 150);
    if (!name) continue;
    const explicitId = validUuid(document.id);
    const match = (existingDocuments || []).find((row: any) => explicitId && row.id === explicitId)
      || (existingDocuments || []).find((row: any) => cleanText(row.document_name, 150).toLowerCase() === name.toLowerCase());
    const payload = {
      school_id: schoolId,
      document_name: name,
      document_code: nullableText(document.documentCode || slugCode(name, `DOC${index + 1}`), 30),
      is_required: document.isRequired !== false,
      applies_to: ['student', 'staff', 'both'].includes(document.appliesTo) ? document.appliesTo : 'student',
      description: nullableText(document.description, 1000),
      is_active: true,
      sort_order: index * 10,
      metadata: { source: 'academic_setup_cloud', legacy_id: cleanText(document.id, 100) },
      updated_by: actorUserId,
      updated_at: now
    };
    if (match?.id) {
      const { data, error } = await db.from('school_document_requirements').update(payload).eq('id', match.id).eq('school_id', schoolId).select('id').single();
      if (error) throw new Error(error.message || 'Document requirement could not be updated.');
      touchedDocumentIds.add(data.id);
    } else {
      const { data, error } = await db.from('school_document_requirements').insert({ ...payload, created_by: actorUserId }).select('id').single();
      if (error) throw new Error(error.message || 'Document requirement could not be created.');
      touchedDocumentIds.add(data.id);
    }
  }
  const staleDocumentIds = (existingDocuments || []).filter((row: any) => row.metadata?.source === 'academic_setup_cloud' && !touchedDocumentIds.has(row.id)).map((row: any) => row.id);
  if (staleDocumentIds.length) {
    const { error } = await db.from('school_document_requirements').delete().eq('school_id', schoolId).in('id', staleDocumentIds);
    if (error) throw new Error(error.message || 'Removed document requirements could not be deleted.');
  }

  const print = setup.printSettings || {};
  const printPayload = {
    school_id: schoolId,
    paper_size: ['A4', 'A3', 'Letter'].includes(print.paperSize) ? print.paperSize : 'A4',
    orientation: ['Portrait', 'Landscape'].includes(print.orientation) ? print.orientation : 'Portrait',
    margin_top_mm: safeNumber(print.marginTop, 10),
    margin_bottom_mm: safeNumber(print.marginBottom, 10),
    margin_left_mm: safeNumber(print.marginLeft, 10),
    margin_right_mm: safeNumber(print.marginRight, 10),
    show_header: print.showHeader !== false,
    show_footer: print.showFooter !== false,
    logo_position: ['Left', 'Center', 'Right', 'None'].includes(print.logoPosition) ? print.logoPosition : 'Left',
    watermark_text: nullableText(print.watermarkText, 500),
    enable_qr_code: print.enableQRCode === true,
    configuration: { source: 'academic_setup_cloud' },
    updated_by: actorUserId,
    updated_at: now
  };
  const { data: existingPrint, error: printCheckError } = await db.from('school_print_settings').select('school_id').eq('school_id', schoolId).maybeSingle();
  if (printCheckError) throw new Error(printCheckError.message || 'Print settings could not be checked.');
  const printWrite = existingPrint
    ? await db.from('school_print_settings').update(printPayload).eq('school_id', schoolId)
    : await db.from('school_print_settings').insert({ ...printPayload, created_by: actorUserId });
  if (printWrite.error) throw new Error(printWrite.error.message || 'Print settings could not be saved.');

  const globals = setup.globalSettings || {};
  const defaultBoardLegacyId = cleanText(globals.defaultBoardId, 100) || cleanText(boards.find(item => item.isDefault)?.id, 100);
  const defaultMediumLegacyIdForSettings = cleanText(globals.defaultMediumId, 100) || cleanText(mediums.find(item => item.isDefault)?.id, 100);
  const defaultClassLegacyId = cleanText(globals.defaultClassId, 100);
  const defaultBoardId = boardMap.get(defaultBoardLegacyId) || validUuid(defaultBoardLegacyId);
  const defaultMediumId = mediumMap.get(defaultMediumLegacyIdForSettings) || validUuid(defaultMediumLegacyIdForSettings);
  const defaultClassId = classMap.get(defaultClassLegacyId) || validUuid(defaultClassLegacyId);
  const academicSettingsPayload = {
    school_id: schoolId,
    active_academic_year_id: activeYearId,
    default_board_id: defaultBoardId,
    default_medium_id: defaultMediumId,
    default_class_id: defaultClassId,
    timezone: cleanText(globals.defaultTimeZone, 100) || 'Asia/Kolkata',
    date_format: ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY'].includes(globals.dateFormat) ? globals.dateFormat : 'DD/MM/YYYY',
    time_format: globals.timeFormat === '24h' ? '24h' : '12h',
    currency: /^[A-Z]{3}$/.test(cleanText(globals.currency, 3).toUpperCase()) ? cleanText(globals.currency, 3).toUpperCase() : 'INR',
    registration_mode: ['self_approval', 'admin_only', 'both_allowed'].includes(globals.registrationMode) ? globals.registrationMode : 'self_approval',
    parent_approval_required: globals.parentApprovalRequired !== false,
    academic_week_starts_on: 1,
    configuration: {
      source: 'academic_setup_cloud',
      defaultLanguage: cleanText(globals.defaultLanguage, 20) || 'en',
      holidayRules: cleanText(timing.holidayRules, 2000)
    },
    updated_by: actorUserId,
    updated_at: now
  };
  const { data: existingSettings, error: settingsCheckError } = await db.from('school_academic_settings').select('school_id').eq('school_id', schoolId).maybeSingle();
  if (settingsCheckError) throw new Error(settingsCheckError.message || 'Academic settings could not be checked.');
  const settingsWrite = existingSettings
    ? await db.from('school_academic_settings').update(academicSettingsPayload).eq('school_id', schoolId)
    : await db.from('school_academic_settings').insert({ ...academicSettingsPayload, created_by: actorUserId });
  if (settingsWrite.error) throw new Error(settingsWrite.error.message || 'Academic settings could not be saved.');

  const importKey = 'legacy_local_setup_v1';
  const rowCounts = {
    academicYears: academicYears.length,
    boards: boards.length,
    mediums: mediums.length,
    classes: classes.length,
    divisions: divisions.length,
    subjects: subjects.length,
    subjectGroups: groups.length,
    terms: terms.length,
    grades: grades.length,
    periods: periodItems.length,
    holidays: holidayItems.length,
    documents: documentItems.length
  };
  const { data: existingImport, error: importCheckError } = await db.from('school_academic_imports').select('id').eq('school_id', schoolId).eq('import_key', importKey).maybeSingle();
  if (importCheckError) throw new Error(importCheckError.message || 'Academic import state could not be checked.');
  const importPayload = {
    school_id: schoolId,
    import_key: importKey,
    source_kind: mode === 'import' ? 'legacy_local_setup' : 'system',
    status: 'completed',
    row_counts: rowCounts,
    notes: mode === 'import' ? 'Existing browser academic setup was copied to the school cloud foundation.' : 'Cloud academic setup was updated from the authorized Academic Setup module.',
    imported_by: actorUserId,
    imported_at: now,
    metadata: { source: 'academic_setup_cloud', last_action: auditAction }
  };
  const importWrite = existingImport
    ? await db.from('school_academic_imports').update(importPayload).eq('id', existingImport.id)
    : await db.from('school_academic_imports').insert(importPayload);
  if (importWrite.error) throw new Error(importWrite.error.message || 'Academic import state could not be completed.');

  await auditAcademicChange(db, schoolId, actorUserId, auditAction, auditDetail, { mode, rowCounts });
  return loadAcademicSetupCloud(db, schoolId);
}

export async function deleteAcademicSubjectCloud(
  db: SupabaseClient,
  schoolId: string,
  actorUserId: string,
  subjectId: string
): Promise<void> {
  if (!validUuid(subjectId)) throw new Error('A valid subject ID is required.');
  const usageTables = [
    'school_subject_teacher_assignments',
    'subject_teachers',
    'school_subject_mappings',
    'school_subject_group_members',
    'student_mark_entries',
    'subject_mark_entries',
    'teacher_subject_mark_entries',
    'edunixo_teacher_assignments'
  ];
  for (const table of usageTables) {
    const { count, error } = await db.from(table).select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('subject_id', subjectId);
    if (error) {
      const missing = ['42P01', 'PGRST205'].includes(String(error.code || '').toUpperCase()) || /does not exist|could not find the table/i.test(error.message || '');
      if (!missing) throw new Error(error.message || 'Subject usage could not be checked.');
    } else if ((count || 0) > 0) {
      throw new Error('This subject is already in use and cannot be permanently deleted. Deactivate it instead.');
    }
  }
  // Permanent delete is intentionally exceptional: current mappings/assignments are never
  // cascade-cleaned here. If anything references the subject, the caller must deactivate it
  // or remove the dependency explicitly in its canonical owner workflow first.
  const { error } = await db.from('subjects').delete().eq('id', subjectId).eq('school_id', schoolId);
  if (error) {
    const conflict = error.code === '23503' || /foreign key|violates/i.test(error.message || '');
    throw new Error(conflict ? 'This subject is already in use and cannot be permanently deleted. Deactivate it instead.' : error.message || 'Subject could not be deleted.');
  }
  await auditAcademicChange(db, schoolId, actorUserId, 'DELETE_SUBJECT', 'Deleted a subject from Academic Setup.', { subjectId });
}
