/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ClipboardList, Plus, Trash2, Edit2, Check, X, Shield, Info, 
  Printer, CheckCircle2, ChevronRight, Settings, AlertCircle, FileText, 
  RefreshCw, CheckSquare, Save, Eye, Globe, Download, Upload, ArrowLeft, ArrowRight,
  Undo2, Redo2, Search, Filter, Lock, Unlock, HelpCircle, Users, CheckSquare2,
  FileSpreadsheet, FileDown, BookOpen, AlertTriangle, Bell
} from 'lucide-react';
import { 
  Language, User, ClassStructure, SubjectMasterItem,
  Examination, FormativeHead, SummativeHead, AssessmentPattern, MarkListTemplate,
  StudentMarkEntry, SubjectLockState, LanguageSubRow
} from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import { getClassAssessmentWeightage } from '../lib/assessmentRules';
import { PrintLetterhead, PrintSignatureArea } from './PrintPDFButton';
import { MarkListReportsAndPrint } from './MarkListReportsAndPrint';
import * as XLSX from 'xlsx';
import { requestActionConfirm } from '../lib/actionConfirm';

interface SmartMarkListAProps {
  lang: Language;
  user: User;
  onRefreshData?: () => void;
  readOnlyMode?: boolean;
  initialAcademicYear?: string;
  initialExamId?: string;
  initialClassName?: string;
  initialDivisionName?: string;
  initialSubjectName?: string;
}

// Configurable Special codes
const SPECIAL_CODES = [
  { code: 'AB', label: 'Absent (غائب / अनुपस्थित)', description: 'Student was absent from the examination' },
  { code: 'ML', label: 'Medical Leave (طبی رخصت / चिकित्सा अवकाश)', description: 'Exempt due to approved medical reasons' },
  { code: 'EX', label: 'Exempted (مستثنیٰ / छूट)', description: 'Exempted from this evaluation component' },
  { code: 'WH', label: 'Withheld (روکا گیا / रोका गया)', description: 'Marks are withheld due to pending review' },
  { code: 'NA', label: 'Not Applicable (قابل اطلاق نہیں / लागू नहीं)', description: 'Component is not applicable to this student' }
];

const SPECIAL_CODE_SET = new Set(SPECIAL_CODES.map(c => c.code));

const validateCellValue = (val: string | number, maxMarks: number): { isValid: boolean; error?: string } => {
  if (val === '' || val === null || val === undefined) return { isValid: true };
  
  if (typeof val === 'number') {
    if (val < 0) return { isValid: false, error: 'Marks cannot be negative.' };
    if (val > maxMarks) return { isValid: false, error: `Marks cannot exceed Maximum Marks of ${maxMarks}.` };
    return { isValid: true };
  }

  const stringVal = String(val).trim();
  if (stringVal === '') return { isValid: true };

  const upperVal = stringVal.toUpperCase();
  if (SPECIAL_CODE_SET.has(upperVal)) {
    return { isValid: true };
  }

  const num = Number(stringVal);
  if (isNaN(num)) {
    return { isValid: false, error: 'Only numeric marks or special codes (AB, ML, EX, WH, NA) allowed.' };
  }

  if (num < 0) {
    return { isValid: false, error: 'Marks cannot be negative.' };
  }

  if (num > maxMarks) {
    return { isValid: false, error: `Marks cannot exceed Maximum Marks of ${maxMarks}.` };
  }

  return { isValid: true };
};

interface SmartMarkListRowProps {
  entry: StudentMarkEntry;
  rowIndex: number;
  isHindiMarathiTemplate: boolean;
  formativeHeads: FormativeHead[];
  summativeHeads: SummativeHead[];
  excludeStudentId: boolean;
  excludeGrNumber: boolean;
  excludeRemarks: boolean;
  isRegisterLocked: boolean;
  isRowActive: boolean;
  activeColId: string | null;
  passingMarks?: number;
  cellRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  updateCell: (rowIndex: number, colId: string, value: string, langKey?: string, recordHistory?: boolean) => void;
  setActiveCell: (cell: { rowIndex: number; colId: string } | null) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>, rowIndex: number, colId: string, langKey?: 'hindi' | 'marathi') => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colId: string, langKey?: 'hindi' | 'marathi') => void;
}

const SmartMarkListRow = React.memo(function SmartMarkListRow({
  entry,
  rowIndex,
  isHindiMarathiTemplate,
  formativeHeads,
  summativeHeads,
  excludeStudentId,
  excludeGrNumber,
  excludeRemarks,
  isRegisterLocked,
  isRowActive,
  activeColId,
  passingMarks,
  cellRefs,
  updateCell,
  setActiveCell,
  handlePaste,
  handleKeyDown
}: SmartMarkListRowProps) {
  if (isHindiMarathiTemplate) {
    const rowDefs = [
      { key: 'hindi', label: 'Hindi', type: 'editable' },
      { key: 'marathi', label: 'Marathi', type: 'editable' },
      { key: 'total', label: 'Total', type: 'calculated' }
    ];
    const numRows = rowDefs.length;

    const defaultRows = [
      { rowKey: 'hindi', rowLabel: 'Hindi', formativeMarks: {}, summativeMarks: {}, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' },
      { rowKey: 'marathi', rowLabel: 'Marathi', formativeMarks: {}, summativeMarks: {}, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' },
      { rowKey: 'total', rowLabel: 'Total', formativeMarks: {}, summativeMarks: {}, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' }
    ];

    const rows = entry.markRows && entry.markRows.length === 3 ? entry.markRows : defaultRows;

    return (
      <React.Fragment key={entry.id}>
        {rowDefs.map((rDef, rIdx) => {
          const isFirstRow = rIdx === 0;
          const isEditable = rDef.type === 'editable';
          const subRowData = rows.find(r => r.rowKey === rDef.key) || defaultRows[rIdx];

          return (
            <tr key={`${entry.id}_${rDef.key}`} className={`${!isEditable ? 'bg-slate-100/70' : 'hover:bg-slate-50/40'} border-b transition-colors`}>
              {/* Student Bio Cols (rendered only on the first row using rowSpan) */}
              {isFirstRow && (
                <>
                  {!excludeStudentId && (
                    <td rowSpan={numRows} className="p-3 text-center text-xs font-mono font-bold text-slate-600 sticky left-0 bg-white border-r z-10">
                      {entry.rollNumber}
                    </td>
                  )}
                  {!excludeGrNumber && (
                    <td rowSpan={numRows} className="p-3 text-center text-xs font-mono text-slate-500 sticky left-16 bg-white border-r z-10">
                      {entry.grNumber}
                    </td>
                  )}
                  <td rowSpan={numRows} className={`p-3 text-xs font-extrabold text-slate-800 sticky bg-white border-r z-10 whitespace-nowrap overflow-hidden text-ellipsis ${
                    excludeStudentId && excludeGrNumber ? 'left-0' : excludeStudentId ? 'left-0' : excludeGrNumber ? 'left-16' : 'left-40'
                  }`}>
                    {entry.studentName}
                  </td>
                </>
              )}

              {/* Row Label (Hindi, Marathi, Total, etc) */}
              <td className={`p-3 text-center text-xs font-bold border-r uppercase tracking-wider font-sans ${
                rDef.key === 'hindi' ? 'text-amber-700 bg-amber-50/80' :
                rDef.key === 'marathi' ? 'text-teal-700 bg-teal-50/80' :
                'text-indigo-900 bg-indigo-100/40'
              }`}>
                {rDef.label}
              </td>

              {/* Formative Cells */}
              {formativeHeads.map(h => {
                const val = subRowData.formativeMarks[h.id] !== undefined ? subRowData.formativeMarks[h.id] : '';
                
                if (!isEditable) {
                  // Calculated / Readonly Row
                  return (
                    <td key={h.id} className="p-3 text-center border-r font-mono text-xs bg-indigo-50/30 font-extrabold text-indigo-900">
                      {val}
                    </td>
                  );
                }

                const validation = validateCellValue(val, h.maxMarks);
                const isSelected = isRowActive && activeColId === `${h.id}_${rDef.key}`;

                return (
                  <td
                    key={h.id}
                    onClick={() => !isRegisterLocked && isEditable && setActiveCell({ rowIndex, colId: `${h.id}_${rDef.key}` })}
                    className={`p-1.5 text-center border-r transition-all relative ${
                      !validation.isValid ? 'bg-red-50 border-red-400 border-2' : ''
                    } ${
                      isSelected ? 'bg-indigo-50/50 ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <input
                      ref={el => { if (cellRefs.current) cellRefs.current[`${rowIndex}_${rDef.key}_${h.id}`] = el; }}
                      type="text"
                      value={val}
                      disabled={isRegisterLocked}
                      onPaste={(e) => handlePaste(e, rowIndex, h.id, rDef.key as any)}
                      onChange={(e) => updateCell(rowIndex, h.id, e.target.value, rDef.key)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, h.id, rDef.key as any)}
                      className="w-full h-8 text-center text-xs font-bold focus:outline-none bg-transparent select-text disabled:text-slate-700 text-slate-800 font-mono"
                    />
                    {!validation.isValid && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </td>
                );
              })}

              {/* Formative Total */}
              <td className={`p-3 text-center border-r font-mono text-xs ${
                isEditable ? 'font-bold text-indigo-700 bg-indigo-50/20' : 'font-black text-indigo-800 bg-indigo-100/50'
              }`}>
                {subRowData.formativeTotal}
              </td>

              {/* Summative Cells */}
              {summativeHeads.map(h => {
                const val = subRowData.summativeMarks[h.id] !== undefined ? subRowData.summativeMarks[h.id] : '';

                if (!isEditable) {
                  // Calculated / Readonly Row
                  return (
                    <td key={h.id} className="p-3 text-center border-r font-mono text-xs bg-blue-50/30 font-extrabold text-blue-900">
                      {val}
                    </td>
                  );
                }

                const validation = validateCellValue(val, h.maxMarks);
                const isSelected = isRowActive && activeColId === `${h.id}_${rDef.key}`;

                return (
                  <td
                    key={h.id}
                    onClick={() => !isRegisterLocked && isEditable && setActiveCell({ rowIndex, colId: `${h.id}_${rDef.key}` })}
                    className={`p-1.5 text-center border-r transition-all relative ${
                      !validation.isValid ? 'bg-red-50 border-red-400 border-2' : ''
                    } ${
                      isSelected ? 'bg-blue-50/50 ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <input
                      ref={el => { if (cellRefs.current) cellRefs.current[`${rowIndex}_${rDef.key}_${h.id}`] = el; }}
                      type="text"
                      value={val}
                      disabled={isRegisterLocked}
                      onPaste={(e) => handlePaste(e, rowIndex, h.id, rDef.key as any)}
                      onChange={(e) => updateCell(rowIndex, h.id, e.target.value, rDef.key)}
                      onKeyDown={(e) => handleKeyDown(e, rowIndex, h.id, rDef.key as any)}
                      className="w-full h-8 text-center text-xs font-bold focus:outline-none bg-transparent select-text disabled:text-slate-700 text-slate-800 font-mono"
                    />
                    {!validation.isValid && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </td>
                );
              })}

              {/* Summative Total */}
              <td className={`p-3 text-center border-r font-mono text-xs ${
                isEditable ? 'font-bold text-blue-700 bg-blue-50/20' : 'font-black text-blue-800 bg-blue-100/50'
              }`}>
                {subRowData.summativeTotal}
              </td>

              {/* Combined Grand Total Cell (RowSpan 3) */}
              {isFirstRow && (
                <td 
                  rowSpan={numRows} 
                  className="p-3 text-center border-r font-mono text-xs font-black text-emerald-900 bg-emerald-50/50 align-middle"
                >
                  {entry.subjectTotal !== undefined && entry.subjectTotal !== ('' as any) ? entry.subjectTotal : (entry.languageRows?.total?.subjectTotal ?? '')}
                </td>
              )}

              {/* Combined Grade Cell (RowSpan 3) */}
              {isFirstRow && (
                <td 
                  rowSpan={numRows} 
                  className="p-3 text-center border-r font-mono text-xs font-black text-slate-800 bg-slate-100/70 align-middle"
                >
                  {entry.grade || entry.languageRows?.total?.grade || ''}
                </td>
              )}

              {/* Remarks (rowSpan={numRows}) */}
              {isFirstRow && !excludeRemarks && (
                <td rowSpan={numRows} className="p-1.5 border-r bg-white">
                  <input
                    ref={el => { if (cellRefs.current) cellRefs.current[`${rowIndex}_remarks`] = el; }}
                    type="text"
                    value={entry.remarks || ''}
                    disabled={isRegisterLocked}
                    onChange={(e) => updateCell(rowIndex, 'remarks', e.target.value)}
                    className="w-full h-8 px-2 text-xs font-semibold focus:outline-none bg-transparent text-slate-700 disabled:text-slate-600"
                    placeholder="Feedback..."
                  />
                </td>
              )}
            </tr>
          );
        })}
      </React.Fragment>
    );
  }

  return (
    <tr className="hover:bg-indigo-50/30 transition-colors">
      {/* FROZEN STICKY COLS */}
      {!excludeStudentId && (
        <td className="p-3 text-center text-xs font-mono font-bold text-slate-600 sticky left-0 bg-white border-r z-10 group-hover:bg-indigo-50/30">
          {entry.rollNumber}
        </td>
      )}
      {!excludeGrNumber && (
        <td className="p-3 text-center text-xs font-mono text-slate-500 sticky left-16 bg-white border-r z-10">
          {entry.grNumber}
        </td>
      )}
      <td className={`p-3 text-xs font-extrabold text-slate-800 sticky bg-white border-r z-10 whitespace-nowrap overflow-hidden text-ellipsis ${
        excludeStudentId && excludeGrNumber ? 'left-0' : excludeStudentId ? 'left-0' : excludeGrNumber ? 'left-16' : 'left-40'
      }`}>
        {entry.studentName}
      </td>

      {/* FORMATIVE EDITABLE CELLS */}
      {formativeHeads.map(h => {
        const val = entry.formativeMarks[h.id] !== undefined ? entry.formativeMarks[h.id] : '';
        const validation = validateCellValue(val, h.maxMarks);
        const isSelected = isRowActive && activeColId === h.id;
        
        return (
          <td 
            key={h.id} 
            onClick={() => !isRegisterLocked && setActiveCell({ rowIndex, colId: h.id })}
            className={`p-1.5 text-center border-r transition-all relative ${
              !validation.isValid ? 'bg-red-50 border-red-400 border-2' : ''
            } ${
              isSelected ? 'bg-indigo-50/50 ring-2 ring-indigo-500' : ''
            }`}
          >
            <input
              ref={el => { if (cellRefs.current) cellRefs.current[`${rowIndex}_${h.id}`] = el; }}
              type="text"
              value={val}
              disabled={isRegisterLocked}
              onPaste={(e) => handlePaste(e, rowIndex, h.id)}
              onChange={(e) => updateCell(rowIndex, h.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, h.id)}
              className={`w-full h-8 text-center text-xs font-bold focus:outline-none bg-transparent select-text disabled:text-slate-700 ${
                typeof val === 'string' && val !== '' && SPECIAL_CODE_SET.has(val.toUpperCase()) 
                  ? 'text-indigo-600 font-extrabold font-mono bg-indigo-100/50 rounded-md' 
                  : 'text-slate-800 font-mono'
              }`}
            />
            {!validation.isValid && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </td>
        );
      })}

      {/* FA TOTAL CALCULATED */}
      <td className="p-3 text-center border-r font-mono font-bold text-indigo-700 bg-indigo-50/20 text-xs">
        {entry.formativeTotal}
      </td>

      {/* SUMMATIVE EDITABLE CELLS */}
      {summativeHeads.map(h => {
        const val = entry.summativeMarks[h.id] !== undefined ? entry.summativeMarks[h.id] : '';
        const validation = validateCellValue(val, h.maxMarks);
        const isSelected = isRowActive && activeColId === h.id;

        return (
          <td 
            key={h.id} 
            onClick={() => !isRegisterLocked && setActiveCell({ rowIndex, colId: h.id })}
            className={`p-1.5 text-center border-r transition-all relative ${
              !validation.isValid ? 'bg-red-50 border-red-400 border-2' : ''
            } ${
              isSelected ? 'bg-blue-50/50 ring-2 ring-blue-500' : ''
            }`}
          >
            <input
              ref={el => { if (cellRefs.current) cellRefs.current[`${rowIndex}_${h.id}`] = el; }}
              type="text"
              value={val}
              disabled={isRegisterLocked}
              onPaste={(e) => handlePaste(e, rowIndex, h.id)}
              onChange={(e) => updateCell(rowIndex, h.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, rowIndex, h.id)}
              className={`w-full h-8 text-center text-xs font-bold focus:outline-none bg-transparent select-text disabled:text-slate-700 ${
                typeof val === 'string' && val !== '' && SPECIAL_CODE_SET.has(val.toUpperCase()) 
                  ? 'text-blue-600 font-extrabold font-mono bg-blue-100/50 rounded-md' 
                  : 'text-slate-800 font-mono'
              }`}
            />
            {!validation.isValid && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </td>
        );
      })}

      {/* SA TOTAL CALCULATED */}
      <td className="p-3 text-center border-r font-mono font-bold text-blue-700 bg-blue-50/20 text-xs">
        {entry.summativeTotal}
      </td>

      {/* GRAND TOTAL CALCULATED */}
      <td className={`p-3 text-center border-r font-mono font-black text-xs ${
        passingMarks !== undefined && Number(entry.subjectTotal) < passingMarks 
          ? 'text-rose-600 bg-rose-50' 
          : 'text-emerald-700 bg-emerald-50/50'
      }`}>
        {entry.subjectTotal}
      </td>

      {/* REMARKS EDITABLE CELL */}
      {!excludeRemarks && (
        <td 
          onClick={() => !isRegisterLocked && setActiveCell({ rowIndex, colId: 'remarks' })}
          className={`p-1.5 border-r ${
            isRowActive && activeColId === 'remarks' ? 'ring-2 ring-slate-400 bg-slate-50' : ''
          }`}
        >
          <input
            ref={el => { if (cellRefs.current) cellRefs.current[`${rowIndex}_remarks`] = el; }}
            type="text"
            value={entry.remarks || ''}
            disabled={isRegisterLocked}
            onChange={(e) => updateCell(rowIndex, 'remarks', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rowIndex, 'remarks')}
            className="w-full h-8 px-2 text-xs font-semibold focus:outline-none bg-transparent text-slate-700 disabled:text-slate-600"
            placeholder="Feedback..."
          />
        </td>
      )}
    </tr>
  );
});

export default function SmartMarkListA({ 
  lang, 
  user, 
  onRefreshData,
  readOnlyMode = false,
  initialAcademicYear,
  initialExamId,
  initialClassName,
  initialDivisionName,
  initialSubjectName
}: SmartMarkListAProps) {
  // --- DATABASE & ACADEMIC STATES ---
  const [classes, setClasses] = useState<ClassStructure[]>([]);
  const [subjects, setSubjects] = useState<SubjectMasterItem[]>([]);
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [patterns, setPatterns] = useState<AssessmentPattern[]>([]);
  const [templates, setTemplates] = useState<MarkListTemplate[]>([]);

  // --- ENGINE CONFIG FILTERS (No-Print) ---
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026-27');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // --- RESOLVED GRID STATES ---
  const [activePattern, setActivePattern] = useState<AssessmentPattern | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<MarkListTemplate | null>(null);
  const [autoLoadedMessage, setAutoLoadedMessage] = useState<string>('');
  const [lockState, setLockState] = useState<SubjectLockState | null>(null);
  const isRegisterLocked = !!(lockState?.isLocked || readOnlyMode);

  // --- GRID SPREADSHEET STATES ---
  const [gridEntries, setGridEntries] = useState<StudentMarkEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed' | 'Absent' | 'Special'>('All');
  
  // Refs for stable callbacks
  const gridEntriesRef = useRef(gridEntries);
  gridEntriesRef.current = gridEntries;

  const isRegisterLockedRef = useRef(isRegisterLocked);
  isRegisterLockedRef.current = isRegisterLocked;
  
  // Cell selection index
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colId: string } | null>(null);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // History state for Undo/Redo
  const [historyStack, setHistoryStack] = useState<StudentMarkEntry[][]>([]);
  const [redoStack, setRedoStack] = useState<StudentMarkEntry[][]>([]);

  // Auto save & persistence state indicators
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [importError, setImportError] = useState<string>('');
  
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockReason, setUnlockReason] = useState<string>('');

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditsPanel, setShowAuditsPanel] = useState<boolean>(false);

  // --- ADVANCED WORKFLOW STATES (PROMPT 17C) ---
  const [pageSize, setPageSize] = useState<'A4' | 'A3'>('A4');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [printTheme, setPrintTheme] = useState<'color' | 'monochrome'>('color');
  const [excludeStudentId, setExcludeStudentId] = useState<boolean>(false);
  const [excludeGrNumber, setExcludeGrNumber] = useState<boolean>(false);
  const [excludeRemarks, setExcludeRemarks] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const [activeReportTab, setActiveReportTab] = useState<string>('subject_wise');
  const [selectedReportTeacher, setSelectedReportTeacher] = useState<string>('');
  const [showReportsCenter, setShowReportsCenter] = useState<boolean>(false);

  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [returnReason, setReturnReason] = useState<string>('');

  // --- HINDI/MARATHI COMBINED CLASS 1-8 LOGIC HELPERS ---
  const isHindiMarathiClasses1To8 = useMemo(() => {
    if (!activePattern) return false;
    return activePattern.subjectType === 'Hindi_Marathi';
  }, [activePattern]);

  const isHindiMarathiTemplate = isHindiMarathiClasses1To8;

  const normalizeLanguageMarkKeys = (
    markMap: Record<string, number | string> | undefined,
    activeHeads: any[],
    prefix: 'fh' | 'sh'
  ): Record<string, number | string> => {
    const result: Record<string, number | string> = {};
    if (!markMap) return result;

    // 1. If an exact active head ID already exists, preserve it.
    activeHeads.forEach(h => {
      if (markMap[h.id] !== undefined) {
        result[h.id] = markMap[h.id];
      }
    });

    // 2. Otherwise map old positional keys by index:
    //    fh_0 -> activeHeads[0].id, sh_0 -> activeHeads[0].id
    activeHeads.forEach((h, index) => {
      if (result[h.id] === undefined) {
        const legacyKey = `${prefix}_${index}`;
        if (markMap[legacyKey] !== undefined) {
          result[h.id] = markMap[legacyKey];
        } else {
          result[h.id] = '';
        }
      }
    });

    // 5. Do not delete original data until the normalized record has been saved successfully (Task 4, Rule 5)
    Object.keys(markMap).forEach(key => {
      if (result[key] === undefined) {
        result[key] = markMap[key];
      }
    });

    return result;
  };

  const getGradeForScore = (score: number | '', maxScore: number): string => {
    if (score === '' || isNaN(Number(score)) || maxScore <= 0) return '';
    const pct = (Number(score) / maxScore) * 100;
    if (pct >= 91) return 'A1';
    if (pct >= 81) return 'A2';
    if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2';
    if (pct >= 51) return 'C1';
    if (pct >= 41) return 'C2';
    if (pct >= 35) return 'D';
    return 'E';
  };

  const computeLanguageBlockTotals = (
    hindiFormative: Record<string, number | string> = {},
    hindiSummative: Record<string, number | string> = {},
    marathiFormative: Record<string, number | string> = {},
    marathiSummative: Record<string, number | string> = {},
    fHeads: any[] = [],
    sHeads: any[] = []
  ): { hindi: LanguageSubRow; marathi: LanguageSubRow; total: LanguageSubRow } => {
    // 1. Calculate Hindi totals
    let hindiFormativeSum = 0;
    let hindiSummativeSum = 0;
    let hasHindiFormativeValue = false;
    let hasHindiSummativeValue = false;

    fHeads.forEach(h => {
      const val = hindiFormative[h.id];
      if (val !== undefined && val !== null && val !== '') {
        hasHindiFormativeValue = true;
        if (typeof val === 'number') {
          hindiFormativeSum += val;
        } else if (!isNaN(Number(val))) {
          hindiFormativeSum += Number(val);
        }
      }
    });

    sHeads.forEach(h => {
      const val = hindiSummative[h.id];
      if (val !== undefined && val !== null && val !== '') {
        hasHindiSummativeValue = true;
        if (typeof val === 'number') {
          hindiSummativeSum += val;
        } else if (!isNaN(Number(val))) {
          hindiSummativeSum += Number(val);
        }
      }
    });

    const hindiFormativeTotal = hasHindiFormativeValue ? Number(hindiFormativeSum.toFixed(2)) : '';
    const hindiSummativeTotal = hasHindiSummativeValue ? Number(hindiSummativeSum.toFixed(2)) : '';
    const hindiSubjectTotal = (hasHindiFormativeValue || hasHindiSummativeValue)
      ? Number(((Number(hindiFormativeTotal) || 0) + (Number(hindiSummativeTotal) || 0)).toFixed(2))
      : '';
    const individualMax = fHeads.reduce((sum, h) => sum + h.maxMarks, 0) + sHeads.reduce((sum, h) => sum + h.maxMarks, 0);
    const hindiGrade = hindiSubjectTotal !== '' ? getGradeForScore(hindiSubjectTotal, individualMax) : '';

    // 2. Calculate Marathi totals
    let marathiFormativeSum = 0;
    let marathiSummativeSum = 0;
    let hasMarathiFormativeValue = false;
    let hasMarathiSummativeValue = false;

    fHeads.forEach(h => {
      const val = marathiFormative[h.id];
      if (val !== undefined && val !== null && val !== '') {
        hasMarathiFormativeValue = true;
        if (typeof val === 'number') {
          marathiFormativeSum += val;
        } else if (!isNaN(Number(val))) {
          marathiFormativeSum += Number(val);
        }
      }
    });

    sHeads.forEach(h => {
      const val = marathiSummative[h.id];
      if (val !== undefined && val !== null && val !== '') {
        hasMarathiSummativeValue = true;
        if (typeof val === 'number') {
          marathiSummativeSum += val;
        } else if (!isNaN(Number(val))) {
          marathiSummativeSum += Number(val);
        }
      }
    });

    const marathiFormativeTotal = hasMarathiFormativeValue ? Number(marathiFormativeSum.toFixed(2)) : '';
    const marathiSummativeTotal = hasMarathiSummativeValue ? Number(marathiSummativeSum.toFixed(2)) : '';
    const marathiSubjectTotal = (hasMarathiFormativeValue || hasMarathiSummativeValue)
      ? Number(((Number(marathiFormativeTotal) || 0) + (Number(marathiSummativeTotal) || 0)).toFixed(2))
      : '';
    const marathiGrade = marathiSubjectTotal !== '' ? getGradeForScore(marathiSubjectTotal, individualMax) : '';

    // 3. Calculate Total row (per head sum)
    const totalFormative: Record<string, number | string> = {};
    const totalSummative: Record<string, number | string> = {};

    fHeads.forEach(h => {
      const hVal = hindiFormative[h.id];
      const mVal = marathiFormative[h.id];
      const hasH = hVal !== undefined && hVal !== null && hVal !== '';
      const hasM = mVal !== undefined && mVal !== null && mVal !== '';

      if (hasH || hasM) {
        const hNum = typeof hVal === 'number' ? hVal : (!isNaN(Number(hVal)) ? Number(hVal) : 0);
        const mNum = typeof mVal === 'number' ? mVal : (!isNaN(Number(mVal)) ? Number(mVal) : 0);
        totalFormative[h.id] = Number((hNum + mNum).toFixed(2));
      } else {
        totalFormative[h.id] = '';
      }
    });

    sHeads.forEach(h => {
      const hVal = hindiSummative[h.id];
      const mVal = marathiSummative[h.id];
      const hasH = hVal !== undefined && hVal !== null && hVal !== '';
      const hasM = mVal !== undefined && mVal !== null && mVal !== '';

      if (hasH || hasM) {
        const hNum = typeof hVal === 'number' ? hVal : (!isNaN(Number(hVal)) ? Number(hVal) : 0);
        const mNum = typeof mVal === 'number' ? mVal : (!isNaN(Number(mVal)) ? Number(mVal) : 0);
        totalSummative[h.id] = Number((hNum + mNum).toFixed(2));
      } else {
        totalSummative[h.id] = '';
      }
    });

    // 4. Calculate total row totals
    const totalFormativeTotal = (hindiFormativeTotal !== '' || marathiFormativeTotal !== '')
      ? Number((Number(hindiFormativeTotal || 0) + Number(marathiFormativeTotal || 0)).toFixed(2))
      : '';

    const totalSummativeTotal = (hindiSummativeTotal !== '' || marathiSummativeTotal !== '')
      ? Number((Number(hindiSummativeTotal || 0) + Number(marathiSummativeTotal || 0)).toFixed(2))
      : '';

    const totalSubjectTotal = (totalFormativeTotal !== '' || totalSummativeTotal !== '')
      ? Number((Number(totalFormativeTotal || 0) + Number(totalSummativeTotal || 0)).toFixed(2))
      : '';

    const totalMax = 2 * individualMax;
    const totalGrade = totalSubjectTotal !== '' ? getGradeForScore(totalSubjectTotal, totalMax) : '';

    return {
      hindi: {
        formativeMarks: hindiFormative,
        summativeMarks: hindiSummative,
        formativeTotal: hindiFormativeTotal,
        summativeTotal: hindiSummativeTotal,
        subjectTotal: hindiSubjectTotal,
        grade: hindiGrade
      },
      marathi: {
        formativeMarks: marathiFormative,
        summativeMarks: marathiSummative,
        formativeTotal: marathiFormativeTotal,
        summativeTotal: marathiSummativeTotal,
        subjectTotal: marathiSubjectTotal,
        grade: marathiGrade
      },
      total: {
        formativeMarks: totalFormative,
        summativeMarks: totalSummative,
        formativeTotal: totalFormativeTotal,
        summativeTotal: totalSummativeTotal,
        subjectTotal: totalSubjectTotal,
        grade: totalGrade
      }
    };
  };

  const calculateVerticalHeadsAndTotals = (
    hindiFormative: Record<string, number | string>,
    hindiSummative: Record<string, number | string>,
    marathiFormative: Record<string, number | string>,
    marathiSummative: Record<string, number | string>,
    fHeads: any[],
    sHeads: any[]
  ) => {
    const block = computeLanguageBlockTotals(
      hindiFormative,
      hindiSummative,
      marathiFormative,
      marathiSummative,
      fHeads,
      sHeads
    );

    const totalRow = block.total;
    return {
      formativeMarks: totalRow.formativeMarks,
      summativeMarks: totalRow.summativeMarks,
      formativeTotal: totalRow.formativeTotal,
      summativeTotal: totalRow.summativeTotal,
      subjectTotal: totalRow.subjectTotal,
      grade: totalRow.grade
    };
  };

  // --- COMPONENT LOAD ---
  useEffect(() => {
    loadDatabase();
  }, []);

  const loadDatabase = () => {
    const classesList = LocalERPDatabase.getClasses() || [];
    const examsList = LocalERPDatabase.getExaminations() || [];
    const usersList = LocalERPDatabase.getUsers() || [];
    const academicSetup = LocalERPDatabase.getAcademicSetup();
    const templateList = LocalERPDatabase.getMarkListTemplates() || [];
    const patternList = LocalERPDatabase.getAssessmentPatterns() || [];

    setClasses(classesList);
    setExaminations(examsList.filter(e => e.status === 'Active'));
    setStudents(usersList.filter(u => u.role === 'student'));
    setTemplates(templateList);
    setPatterns(patternList);

    if (academicSetup && academicSetup.subjects) {
      setSubjects(academicSetup.subjects);
    }

    // Default selections
    if (initialAcademicYear) {
      setSelectedAcademicYear(initialAcademicYear);
    }
    if (initialExamId) {
      setSelectedExam(initialExamId);
    } else if (examsList.length > 0) {
      setSelectedExam(examsList[0].id);
    }
    if (initialClassName) {
      setSelectedClass(initialClassName);
      setSelectedDivision(initialDivisionName || '');
    } else if (classesList.length > 0) {
      setSelectedClass(classesList[0].className);
      if (classesList[0].division) {
        setSelectedDivision(classesList[0].division);
      }
    }
    
    // Fetch Audit history
    setAuditLogs(LocalERPDatabase.getAuditLogs() || []);
  };

  // --- DYNAMIC PERMISSIONS SELECTION HOOKS (RBAC FILTERING) ---
  const allowedClasses = useMemo(() => {
    if (user.role === 'headmaster' || user.role === 'clerk' || readOnlyMode) return classes;
    
    // Filter classes assigned to the teacher in Master allocations or Timetable
    const timetable = LocalERPDatabase.getTimetable().filter(t => (t.teacherName || '').toLowerCase() === (user.name || '').toLowerCase());
    const academicSetup = LocalERPDatabase.getAcademicSetup();
    const teacherProfile = academicSetup?.teacherProfiles?.find(
      (t: any) => (user.shalarthId && t.shalarthId === user.shalarthId) || 
                  (user.employeeCode && t.employeeId === user.employeeCode) || 
                  (t.fullName || '').toLowerCase() === (user.name || '').toLowerCase()
    );
    const masterAllocations = academicSetup?.subjectAllocations?.filter(
      (sa: any) => sa.teacherId === teacherProfile?.id && sa.isActive !== false
    ) || [];

    const masterClassNames = masterAllocations.map(sa => sa.className);
    const timetableClassNames = classes.filter(c => timetable.some(t => t.classId === c.id)).map(c => c.className);

    const assignedClassNames = Array.from(new Set([...masterClassNames, ...timetableClassNames]));
    if (assignedClassNames.length === 0) return classes; // fallback
    return classes.filter(c => assignedClassNames.includes(c.className));
  }, [classes, user, readOnlyMode]);

  const activeClassObj = useMemo(() => {
    return allowedClasses.find(c => c.className === selectedClass && (!selectedDivision || c.division === selectedDivision));
  }, [allowedClasses, selectedClass, selectedDivision]);

  const classSubjects = useMemo(() => {
    if (!selectedClass) return [];
    return subjects.filter(sub => sub.classMapping && sub.classMapping.includes(selectedClass));
  }, [subjects, selectedClass]);

  const allowedSubjects = useMemo(() => {
    if (user.role === 'headmaster' || user.role === 'clerk' || readOnlyMode) return classSubjects;

    const timetable = LocalERPDatabase.getTimetable().filter(t => (t.teacherName || '').toLowerCase() === (user.name || '').toLowerCase());
    const academicSetup = LocalERPDatabase.getAcademicSetup();
    const teacherProfile = academicSetup?.teacherProfiles?.find(
      (t: any) => (user.shalarthId && t.shalarthId === user.shalarthId) || 
                  (user.employeeCode && t.employeeId === user.employeeCode) || 
                  (t.fullName || '').toLowerCase() === (user.name || '').toLowerCase()
    );
    const masterAllocations = academicSetup?.subjectAllocations?.filter(
      (sa: any) => sa.teacherId === teacherProfile?.id && sa.isActive !== false
    ) || [];

    const masterSubjectNames = masterAllocations.filter(sa => sa.className === selectedClass).map(sa => sa.subjectName);
    const timetableSubjectNames = timetable.filter(t => classes.find(c => c.id === t.classId)?.className === selectedClass).map(t => t.subject);

    const assignedSubjectNames = Array.from(new Set([...masterSubjectNames, ...timetableSubjectNames]));
    if (assignedSubjectNames.length === 0) return classSubjects; // fallback
    return classSubjects.filter(s => assignedSubjectNames.includes(s.subjectName));
  }, [classSubjects, selectedClass, user, classes, readOnlyMode]);

  // Sync selections
  useEffect(() => {
    if (allowedClasses.length > 0) {
      const exists = allowedClasses.some(c => c.className === selectedClass && (!selectedDivision || c.division === selectedDivision));
      if (!exists) {
        if (initialClassName) {
          setSelectedClass(initialClassName);
          setSelectedDivision(initialDivisionName || '');
        } else {
          setSelectedClass(allowedClasses[0].className);
          if (allowedClasses[0].division) {
            setSelectedDivision(allowedClasses[0].division);
          } else {
            setSelectedDivision('');
          }
        }
      }
    }
  }, [allowedClasses, selectedClass, initialClassName, initialDivisionName, selectedDivision]);

  useEffect(() => {
    if (allowedSubjects.length > 0) {
      const exists = allowedSubjects.some(s => s.id === selectedSubject);
      if (!exists) {
        if (initialSubjectName) {
          const matchedSub = allowedSubjects.find(s => s.subjectName === initialSubjectName || s.id === initialSubjectName);
          if (matchedSub) {
            setSelectedSubject(matchedSub.id);
          } else {
            setSelectedSubject(allowedSubjects[0].id);
          }
        } else {
          setSelectedSubject(allowedSubjects[0].id);
        }
      }
    } else {
      setSelectedSubject('');
    }
  }, [allowedSubjects, selectedSubject, initialSubjectName]);

  const classResultStatus = useMemo(() => {
    if (!selectedClass || !selectedExam) return { status: 'Pending', approvedCount: 0, totalCount: 0, pendingSubjects: [] as string[] };
    
    const allClassSubjects = subjects.filter(sub => sub.classMapping && sub.classMapping.includes(selectedClass));
    const totalCount = allClassSubjects.length;
    if (totalCount === 0) return { status: 'Pending', approvedCount: 0, totalCount: 0, pendingSubjects: [] };

    const allLocks = LocalERPDatabase.getSubjectLockStates() || [];
    let approvedCount = 0;
    const pendingSubjects: string[] = [];

    allClassSubjects.forEach(sub => {
      const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${sub.id}`;
      const l = allLocks.find(lock => lock.id === lockId);
      if (l?.status === 'Approved') {
        approvedCount++;
      } else {
        pendingSubjects.push(sub.subjectName);
      }
    });

    return {
      status: approvedCount === totalCount ? 'Result Ready' : 'Result Pending',
      approvedCount,
      totalCount,
      pendingSubjects
    };
  }, [selectedClass, selectedExam, selectedAcademicYear, selectedDivision, subjects]);

  // --- DYNAMIC NOTIFICATIONS SYSTEM (PROMPT 17C) ---
  const notifications = useMemo(() => {
    const list: { id: string; title: string; desc: string; type: 'info' | 'warn' | 'success'; date: string }[] = [];
    const allLocks = LocalERPDatabase.getSubjectLockStates() || [];

    if (user.role === 'headmaster') {
      // Find locks awaiting approval
      allLocks.forEach(lock => {
        if (lock.status === 'Submitted') {
          const subObj = subjects.find(s => s.id === lock.subjectId);
          list.push({
            id: `notif_${lock.id}_sub`,
            title: '📥 Marks Awaiting Approval',
            desc: `Teacher ${lock.lockedBy} submitted marks for Class ${lock.classId} (${lock.division}) - Subject: ${subObj?.subjectName || lock.subjectId}.`,
            type: 'warn',
            date: lock.lockedAt || 'Recent'
          });
        }
      });

      // Find result readiness alerts
      if (classResultStatus.status === 'Result Ready' && selectedClass) {
        list.push({
          id: `notif_ready_${selectedClass}`,
          title: '🎉 Class Result Ready!',
          desc: `All ${classResultStatus.totalCount} subjects for Class ${selectedClass} (${selectedDivision || 'All'}) are approved and locked. Results are ready to compile.`,
          type: 'success',
          date: 'Just Now'
        });
      }
    } else if (user.role === 'teacher') {
      // Find locks returned for correction
      allLocks.forEach(lock => {
        if (lock.status === 'Returned' && lock.academicYear === selectedAcademicYear) {
          const subObj = subjects.find(s => s.id === lock.subjectId);
          list.push({
            id: `notif_ret_${lock.id}`,
            title: '⚠️ Correction Requested',
            desc: `Marks sheet for Class ${lock.classId} - ${subObj?.subjectName} was returned by Headmaster. Reason: "${lock.returnReason}"`,
            type: 'warn',
            date: lock.unlockedAt || 'Recent'
          });
        }
        if (lock.status === 'Approved' && lock.academicYear === selectedAcademicYear) {
          const subObj = subjects.find(s => s.id === lock.subjectId);
          list.push({
            id: `notif_app_${lock.id}`,
            title: '✅ Marks Register Approved',
            desc: `Evaluation list for Class ${lock.classId} - ${subObj?.subjectName} has been approved and locked.`,
            type: 'success',
            date: lock.lockedAt || 'Recent'
          });
        }
      });
    }

    return list;
  }, [user, subjects, classResultStatus, selectedClass, selectedDivision, selectedAcademicYear]);

  // --- AUTOMATIC PATTERN RESOLUTION ---
  useEffect(() => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      setActivePattern(null);
      setActiveTemplate(null);
      setAutoLoadedMessage('');
      return;
    }

    const currentSubjectObj = subjects.find(s => s.id === selectedSubject);
    const subjectNameLower = currentSubjectObj?.subjectName?.toLowerCase() || '';

    // 1. Check exact custom assessment pattern
    let foundPattern = patterns.find(pat => 
      pat.academicYear === selectedAcademicYear &&
      pat.examId === selectedExam &&
      pat.classId === selectedClass &&
      (pat.subjectId === selectedSubject || pat.subjectId === 'All') &&
      pat.isActive
    );

    // 2. Fallback to generic subject type template
    if (!foundPattern) {
      let subjectType: AssessmentPattern['subjectType'] = 'English';
      if (subjectNameLower.includes('urdu')) {
        subjectType = 'Urdu';
      } else if (subjectNameLower.includes('hindi') || subjectNameLower.includes('marathi') || subjectNameLower.includes('sanskrit')) {
        subjectType = 'Hindi_Marathi';
      } else if (subjectNameLower.includes('math') || subjectNameLower.includes('algebra') || subjectNameLower.includes('geometry') || subjectNameLower.includes('arithmetic')) {
        subjectType = 'Mathematics';
      } else if (subjectNameLower.includes('science') || subjectNameLower.includes('physics') || subjectNameLower.includes('chemistry') || subjectNameLower.includes('biology')) {
        subjectType = 'Science';
      } else if (subjectNameLower.includes('social') || subjectNameLower.includes('history') || subjectNameLower.includes('geography') || subjectNameLower.includes('civics')) {
        subjectType = 'SocialScience';
      } else if (subjectNameLower.includes('art') || subjectNameLower.includes('work') || subjectNameLower.includes('physical') || subjectNameLower.includes('p.e.') || subjectNameLower.includes('drawing')) {
        subjectType = 'Art_PE_WorkExp';
      }

      foundPattern = patterns.find(pat => 
        pat.academicYear === selectedAcademicYear &&
        pat.examId === selectedExam &&
        pat.classId === selectedClass &&
        pat.subjectType === subjectType &&
        pat.isActive
      );

      // 3. Realtime auto-instantiate if no pattern exists
      if (!foundPattern) {
        const matchedTemplate = templates.find(t => {
          if (subjectType === 'Urdu') return t.templateType === 'Urdu';
          if (subjectType === 'Hindi_Marathi') return t.templateType === 'Hindi_Marathi';
          if (subjectType === 'Mathematics') return t.templateType === 'Mathematics';
          if (subjectType === 'Science') return t.templateType === 'Science';
          if (subjectType === 'SocialScience') return t.templateType === 'SocialScience';
          if (subjectType === 'Art_PE_WorkExp') return t.templateType === 'Art_PE_WorkExp';
          return t.templateType === 'English';
        }) || templates[1] || templates[0];

        if (matchedTemplate) {
          const classWeightage = getClassAssessmentWeightage(selectedClass);

          let formativeHeadsMapped = matchedTemplate.defaultFormativeHeads.map((h, i) => ({
            id: `fh_auto_${i}_${Date.now()}`,
            displayName: h.displayName,
            maxMarks: h.maxMarks,
            weightage: h.weightage,
            displayOrder: h.displayOrder,
            isEnabled: h.isEnabled,
            isMandatory: h.isMandatory
          }));

          let summativeHeadsMapped = matchedTemplate.defaultSummativeHeads.map((h, i) => ({
            id: `sh_auto_${i}_${Date.now()}`,
            displayName: h.displayName,
            maxMarks: h.maxMarks,
            weightage: h.weightage,
            displayOrder: h.displayOrder,
            isMandatory: h.isMandatory
          }));

          // Adjust heads to match exact class weightage rule
          if (formativeHeadsMapped.length > 0) {
            if (formativeHeadsMapped.length === 1) {
              formativeHeadsMapped[0].maxMarks = classWeightage.formativeMax;
              formativeHeadsMapped[0].weightage = classWeightage.formativeMax;
            } else {
              const half = Math.round(classWeightage.formativeMax / 2);
              formativeHeadsMapped[0].maxMarks = half;
              formativeHeadsMapped[0].weightage = half;
              for (let k = 1; k < formativeHeadsMapped.length; k++) {
                const share = k === formativeHeadsMapped.length - 1 
                  ? classWeightage.formativeMax - half
                  : Math.floor((classWeightage.formativeMax - half) / (formativeHeadsMapped.length - 1));
                formativeHeadsMapped[k].maxMarks = share;
                formativeHeadsMapped[k].weightage = share;
              }
            }
          }

          if (summativeHeadsMapped.length > 0) {
            summativeHeadsMapped[0].maxMarks = classWeightage.summativeMax;
            summativeHeadsMapped[0].weightage = classWeightage.summativeMax;
          }

          const newAutoPattern: AssessmentPattern = {
            id: `auto_pat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            name: `${selectedClass} - ${currentSubjectObj?.subjectName} Default Layout`,
            academicYear: selectedAcademicYear,
            classId: selectedClass,
            division: selectedDivision || 'All',
            subjectType: matchedTemplate.templateType,
            subjectId: selectedSubject,
            examId: selectedExam,
            formativeHeads: formativeHeadsMapped,
            summativeHeads: summativeHeadsMapped,
            totalFormula: 'sum',
            passingMarks: 35,
            isActive: true,
            rowsPerStudent: matchedTemplate.rowsPerStudent,
            rowDefinitions: matchedTemplate.rowDefinitions,
            calculationRules: matchedTemplate.calculationRules,
            mergeRules: matchedTemplate.mergeRules
          };

          const updatedPatterns = LocalERPDatabase.saveAssessmentPattern(newAutoPattern);
          setPatterns(updatedPatterns);
          foundPattern = newAutoPattern;
        }
      }
    }

    if (foundPattern) {
      setActivePattern(foundPattern);
      const matchedTemplate = templates.find(t => t.templateType === foundPattern?.subjectType);
      setActiveTemplate(matchedTemplate || null);
      setAutoLoadedMessage(
        `✨ Loaded ${matchedTemplate?.templateName || foundPattern.subjectType} criteria layout successfully for '${currentSubjectObj?.subjectName || 'Selected Subject'}'.`
      );
    } else {
      setActivePattern(null);
      setActiveTemplate(null);
      setAutoLoadedMessage('');
    }
  }, [selectedAcademicYear, selectedExam, selectedClass, selectedDivision, selectedSubject, patterns, templates, subjects]);

  const [remoteSyncVersion, setRemoteSyncVersion] = useState<number>(0);

  // --- MOUNT FETCH FROM SUPABASE (FETCH LATEST ENTRIES ON LOAD) ---
  useEffect(() => {
    LocalERPDatabase.fetchStudentMarkEntriesFromSupabase()
      .then((entries) => {
        if (entries && entries.length > 0) {
          setRemoteSyncVersion(prev => prev + 1);
        }
      })
      .catch((err) => {
        console.warn("Supabase mount fetch notice (fallback to local storage):", err);
      });
  }, []);

  // --- RESOLVE SUBJECT LOCKS & LOAD SPREADSHEET ENTRIES ---
  useEffect(() => {
    if (!selectedExam || !selectedClass || !selectedSubject) {
      setGridEntries([]);
      setLockState(null);
      return;
    }

    // 1. Fetch Subject Lock State
    const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${selectedSubject}`;
    const allLocks = LocalERPDatabase.getSubjectLockStates() || [];
    const currentLock = allLocks.find(l => l.id === lockId) || {
      id: lockId,
      academicYear: selectedAcademicYear,
      examId: selectedExam,
      classId: selectedClass,
      division: selectedDivision || 'All',
      subjectId: selectedSubject,
      isLocked: false
    };
    setLockState(currentLock);

    // 2. Fetch/Initialize Student Mark Entries
    const allEntries = LocalERPDatabase.getStudentMarkEntries() || [];
    
    // Get students of this class
    const classStudents = students.filter(s => s.classId === activeClassObj?.id);
    
    // Sort students alphabetically by name
    const sortedStudents = [...classStudents].sort((a, b) => a.name.localeCompare(b.name));

    const formativeHeads = activePattern?.formativeHeads.filter(h => h.isEnabled) || [];
    const summativeHeads = activePattern?.summativeHeads || [];

    const emptyFormativeMarks: Record<string, number | string> = {};
    const emptySummativeMarks: Record<string, number | string> = {};
    
    formativeHeads.forEach(h => {
      emptyFormativeMarks[h.id] = '';
    });
    summativeHeads.forEach(h => {
      emptySummativeMarks[h.id] = '';
    });

    // Map sorted students to mark entries
    const resolvedEntries = sortedStudents.map((stud, idx) => {
      const entryId = `mark_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${selectedSubject}_${stud.id}`;
      const existing = allEntries.find(e => e.id === entryId);

      if (existing) {
        let markRows = existing.markRows;
        let languageRows = existing.languageRows;
        
        if (isHindiMarathiTemplate) {
          // Robust recalculation of all formulas (Horizontal and Vertical) on load to prevent missing values.
          let hindiF: Record<string, any> = {};
          let hindiS: Record<string, any> = {};
          let marathiF: Record<string, any> = {};
          let marathiS: Record<string, any> = {};

          if (markRows && markRows.length === 3) {
            const hRow = markRows.find((r: any) => r.rowKey === 'hindi') || markRows[0];
            const mRow = markRows.find((r: any) => r.rowKey === 'marathi') || markRows[1];
            hindiF = { ...hRow.formativeMarks };
            hindiS = { ...hRow.summativeMarks };
            marathiF = { ...mRow.formativeMarks };
            marathiS = { ...mRow.summativeMarks };
          } else if (languageRows) {
            hindiF = { ...(languageRows.hindi?.formativeMarks || {}) };
            hindiS = { ...(languageRows.hindi?.summativeMarks || {}) };
            marathiF = { ...(languageRows.marathi?.formativeMarks || {}) };
            marathiS = { ...(languageRows.marathi?.summativeMarks || {}) };
          } else {
            // Fallback: legacy flat marks
            hindiF = { ...existing.formativeMarks };
            hindiS = { ...existing.summativeMarks };
          }

          // Safe migration/normalization (Task 5)
          hindiF = normalizeLanguageMarkKeys(hindiF, formativeHeads, 'fh');
          hindiS = normalizeLanguageMarkKeys(hindiS, summativeHeads, 'sh');
          marathiF = normalizeLanguageMarkKeys(marathiF, formativeHeads, 'fh');
          marathiS = normalizeLanguageMarkKeys(marathiS, summativeHeads, 'sh');

          const block = computeLanguageBlockTotals(
            hindiF,
            hindiS,
            marathiF,
            marathiS,
            formativeHeads,
            summativeHeads
          );

          markRows = [
            { rowKey: 'hindi', rowLabel: 'Hindi', ...block.hindi },
            { rowKey: 'marathi', rowLabel: 'Marathi', ...block.marathi },
            { rowKey: 'total', rowLabel: 'Total', ...block.total }
          ];
          languageRows = block;

          const finalRow = block.total;
          return {
            ...existing,
            rollNumber: stud.rollNumber || `Roll-${idx + 1}`,
            grNumber: stud.grNo || `GR-${1000 + idx}`,
            status: currentLock.isLocked ? ('Submitted' as const) : existing.status,
            languageRows,
            markRows,
            formativeMarks: finalRow.formativeMarks,
            summativeMarks: finalRow.summativeMarks,
            formativeTotal: finalRow.formativeTotal !== '' ? finalRow.formativeTotal : '',
            summativeTotal: finalRow.summativeTotal !== '' ? finalRow.summativeTotal : '',
            subjectTotal: finalRow.subjectTotal !== '' ? finalRow.subjectTotal : '',
            grade: finalRow.grade || ''
          };
        }

        // Enforce synchronization of status with lock
        return {
          ...existing,
          rollNumber: stud.rollNumber || `Roll-${idx + 1}`,
          grNumber: stud.grNo || `GR-${1000 + idx}`,
          status: currentLock.isLocked ? ('Submitted' as const) : existing.status,
          languageRows,
          markRows
        };
      }

      // Initialize empty structure
      const formativeMarks = { ...emptyFormativeMarks };
      const summativeMarks = { ...emptySummativeMarks };

      let markRows = undefined;
      let languageRows = undefined;
      if (isHindiMarathiTemplate) {
        markRows = [
          {
            rowKey: 'hindi',
            rowLabel: 'Hindi',
            formativeMarks: { ...emptyFormativeMarks },
            summativeMarks: { ...emptySummativeMarks },
            formativeTotal: '' as number | '',
            summativeTotal: '' as number | '',
            subjectTotal: '' as number | '',
            grade: ''
          },
          {
            rowKey: 'marathi',
            rowLabel: 'Marathi',
            formativeMarks: { ...emptyFormativeMarks },
            summativeMarks: { ...emptySummativeMarks },
            formativeTotal: '' as number | '',
            summativeTotal: '' as number | '',
            subjectTotal: '' as number | '',
            grade: ''
          },
          {
            rowKey: 'total',
            rowLabel: 'Total',
            formativeMarks: { ...emptyFormativeMarks },
            summativeMarks: { ...emptySummativeMarks },
            formativeTotal: '' as number | '',
            summativeTotal: '' as number | '',
            subjectTotal: '' as number | '',
            grade: ''
          }
        ];
        languageRows = {
          hindi: { formativeMarks: { ...emptyFormativeMarks }, summativeMarks: { ...emptySummativeMarks }, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' },
          marathi: { formativeMarks: { ...emptyFormativeMarks }, summativeMarks: { ...emptySummativeMarks }, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' },
          total: { formativeMarks: { ...emptyFormativeMarks }, summativeMarks: { ...emptySummativeMarks }, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' }
        };
      }

      return {
        id: entryId,
        academicYear: selectedAcademicYear,
        examId: selectedExam,
        classId: selectedClass,
        division: selectedDivision || 'All',
        subjectId: selectedSubject,
        studentId: stud.id,
        studentName: stud.name,
        rollNumber: stud.rollNumber || `Roll-${idx + 1}`,
        grNumber: stud.grNo || `GR-${1000 + idx}`,
        formativeMarks,
        summativeMarks,
        formativeTotal: '' as number | '',
        summativeTotal: '' as number | '',
        subjectTotal: '' as number | '',
        remarks: '',
        status: currentLock.isLocked ? ('Submitted' as const) : ('Draft' as const),
        lastSavedAt: new Date().toLocaleTimeString(),
        updatedBy: user.name,
        markRows,
        languageRows
      };
    });

    setGridEntries(resolvedEntries);
    setHistoryStack([]);
    setRedoStack([]);
    setHasUnsavedChanges(false);
  }, [selectedAcademicYear, selectedExam, selectedClass, selectedDivision, selectedSubject, activePattern?.id, students, activeClassObj, isHindiMarathiTemplate, remoteSyncVersion]);

  // --- SPREADSHEET HEADERS HELPER ---
  const formativeHeads = useMemo(() => {
    return activePattern?.formativeHeads.filter(h => h.isEnabled) || [];
  }, [activePattern]);

  const summativeHeads = useMemo(() => {
    return activePattern?.summativeHeads || [];
  }, [activePattern]);

  // --- DERIVED ANALYTICS METRICS (PROMPT 17C REQUIREMENT) ---
  const completionMetrics = useMemo(() => {
    const total = gridEntries.length;
    if (total === 0) return { total: 0, completed: 0, pending: 0, percent: 0, status: 'Draft' };
    
    let completed = 0;
    gridEntries.forEach(entry => {
      let allFilled = true;
      if (isHindiMarathiTemplate) {
        const markRows = entry.markRows || [];
        const editableRows = markRows.filter(r => r.rowKey === 'hindi' || r.rowKey === 'marathi');
        if (editableRows.length < 2) {
          allFilled = false;
        } else {
          editableRows.forEach(row => {
            formativeHeads.forEach(h => {
              if (row.formativeMarks[h.id] === undefined || row.formativeMarks[h.id] === '') allFilled = false;
            });
            summativeHeads.forEach(h => {
              if (row.summativeMarks[h.id] === undefined || row.summativeMarks[h.id] === '') allFilled = false;
            });
          });
        }
      } else {
        formativeHeads.forEach(h => {
          if (entry.formativeMarks[h.id] === undefined || entry.formativeMarks[h.id] === '') allFilled = false;
        });
        summativeHeads.forEach(h => {
          if (entry.summativeMarks[h.id] === undefined || entry.summativeMarks[h.id] === '') allFilled = false;
        });
      }
      if (allFilled) completed++;
    });

    const pending = total - completed;
    const percent = Math.round((completed / total) * 100);
    return {
      total,
      completed,
      pending,
      percent,
      status: lockState?.status || (lockState?.isLocked ? 'Submitted' : 'Draft')
    };
  }, [gridEntries, formativeHeads, summativeHeads, isHindiMarathiTemplate, lockState]);

  // Ordered list of editable columns for arrow navigation
  const editableCols = useMemo(() => {
    const list: { id: string; type: 'fh' | 'sh' | 'remarks'; maxMarks?: number }[] = [];
    formativeHeads.forEach(h => {
      list.push({ id: h.id, type: 'fh', maxMarks: h.maxMarks });
    });
    summativeHeads.forEach(h => {
      list.push({ id: h.id, type: 'sh', maxMarks: h.maxMarks });
    });
    list.push({ id: 'remarks', type: 'remarks' });
    return list;
  }, [formativeHeads, summativeHeads]);

  const editableColsRef = useRef(editableCols);
  editableColsRef.current = editableCols;

  // --- UNDO / REDO STATE ACTIONS ---
  const historyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveToHistory = useCallback((currentEntries: StudentMarkEntry[]) => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      setHistoryStack(prev => [...prev.slice(-19), JSON.parse(JSON.stringify(currentEntries))]);
      setRedoStack([]);
    }, 500);
  }, []);

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setRedoStack(prev => [...prev, JSON.parse(JSON.stringify(gridEntries))]);
    setGridEntries(previous);
    setHistoryStack(prev => prev.slice(0, -1));
    setHasUnsavedChanges(true);
    triggerAutoSave(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistoryStack(prev => [...prev, JSON.parse(JSON.stringify(gridEntries))]);
    setGridEntries(next);
    setRedoStack(prev => prev.slice(0, -1));
    setHasUnsavedChanges(true);
    triggerAutoSave(next);
  };

  // --- MATHEMATICAL FORMULA TOTALLING ---
  const calculateTotals = (
    formative: Record<string, number | string>,
    summative: Record<string, number | string>
  ) => {
    let fSum = 0;
    let sSum = 0;

    formativeHeads.forEach(h => {
      const val = formative[h.id];
      if (typeof val === 'number') {
        fSum += val;
      } else if (typeof val === 'string' && !isNaN(Number(val)) && val !== '') {
        fSum += Number(val);
      }
      // Special codes like 'AB', 'ML' contribute 0 to the sum numeric total but are preserved
    });

    summativeHeads.forEach(h => {
      const val = summative[h.id];
      if (typeof val === 'number') {
        sSum += val;
      } else if (typeof val === 'string' && !isNaN(Number(val)) && val !== '') {
        sSum += Number(val);
      }
    });

    return {
      formativeTotal: Number(fSum.toFixed(2)),
      summativeTotal: Number(sSum.toFixed(2)),
      subjectTotal: Number((fSum + sSum).toFixed(2))
    };
  };

  // --- LIVE VALIDATION HELPER ---
  const validateCellValue = (val: string | number, maxMarks: number): { isValid: boolean; error?: string } => {
    if (val === '' || val === null || val === undefined) return { isValid: true };
    
    if (typeof val === 'number') {
      if (val < 0) return { isValid: false, error: 'Marks cannot be negative.' };
      if (val > maxMarks) return { isValid: false, error: `Marks cannot exceed Maximum Marks of ${maxMarks}.` };
      return { isValid: true };
    }

    const stringVal = String(val).trim();
    if (stringVal === '') return { isValid: true };

    const upperVal = stringVal.toUpperCase();
    if (SPECIAL_CODE_SET.has(upperVal)) {
      return { isValid: true };
    }

    const num = Number(stringVal);
    if (isNaN(num)) {
      return { isValid: false, error: 'Only numeric marks or special codes (AB, ML, EX, WH, NA) allowed.' };
    }

    if (num < 0) {
      return { isValid: false, error: 'Marks cannot be negative.' };
    }

    if (num > maxMarks) {
      return { isValid: false, error: `Marks cannot exceed Maximum Marks of ${maxMarks}.` };
    }

    return { isValid: true };
  };

  // --- REAL-TIME CELL EDIT HANDLER ---
  const updateCell = useCallback((
    rowIndex: number, 
    colId: string, 
    value: string, 
    langKey?: string,
    recordHistory = true
  ) => {
    if (isRegisterLockedRef.current) return;

    if (recordHistory) {
      saveToHistory(gridEntriesRef.current);
    }

    const currentFiltered = filteredEntriesRef.current;
    const targetEntry = currentFiltered[rowIndex];
    if (!targetEntry) return;

    const currentGrid = gridEntriesRef.current;
    const currentCols = editableColsRef.current;

    const updated = currentGrid.map((entry) => {
      if (entry.id !== targetEntry.id) return entry;

      let formattedVal: string | number = '';
      if (value !== '') {
        const trimmed = value.trim();
        if (trimmed !== '') {
          const upper = trimmed.toUpperCase();
          if (SPECIAL_CODE_SET.has(upper)) {
            formattedVal = upper;
          } else {
            const num = Number(trimmed);
            formattedVal = isNaN(num) ? value : num;
          }
        }
      }

      let remarks = entry.remarks;

      if (isHindiMarathiTemplate) {
        if (colId === 'remarks') {
          return {
            ...entry,
            remarks: value,
            lastSavedAt: new Date().toLocaleTimeString(),
            updatedBy: user.name
          };
        }

        if (langKey) {
          let markRows = entry.markRows ? [...entry.markRows] : [];
          if (markRows.length === 0) {
            markRows = [
              {
                rowKey: 'hindi',
                rowLabel: 'Hindi',
                formativeMarks: { ...entry.formativeMarks },
                summativeMarks: { ...entry.summativeMarks },
                formativeTotal: '' as number | '',
                summativeTotal: '' as number | '',
                subjectTotal: '' as number | '',
                grade: ''
              },
              {
                rowKey: 'marathi',
                rowLabel: 'Marathi',
                formativeMarks: {},
                summativeMarks: {},
                formativeTotal: '' as number | '',
                summativeTotal: '' as number | '',
                subjectTotal: '' as number | '',
                grade: ''
              },
              {
                rowKey: 'total',
                rowLabel: 'Total',
                formativeMarks: {},
                summativeMarks: {},
                formativeTotal: '' as number | '',
                summativeTotal: '' as number | '',
                subjectTotal: '' as number | '',
                grade: ''
              }
            ];
          } else {
            markRows = markRows.map(row => ({
              ...row,
              formativeMarks: { ...row.formativeMarks },
              summativeMarks: { ...row.summativeMarks }
            }));
          }

          const rowToUpdateIndex = markRows.findIndex(r => r.rowKey === langKey);
          if (rowToUpdateIndex !== -1) {
            const rowToUpdate = markRows[rowToUpdateIndex];
            const colMeta = currentCols.find(c => c.id === colId);
            if (colMeta?.type === 'fh') {
              rowToUpdate.formativeMarks[colId] = formattedVal;
            } else if (colMeta?.type === 'sh') {
              rowToUpdate.summativeMarks[colId] = formattedVal;
            }

            const hindiRow = markRows.find(r => r.rowKey === 'hindi') || rowToUpdate;
            const marathiRow = markRows.find(r => r.rowKey === 'marathi') || rowToUpdate;

            const block = computeLanguageBlockTotals(
              hindiRow.formativeMarks,
              hindiRow.summativeMarks,
              marathiRow.formativeMarks,
              marathiRow.summativeMarks,
              formativeHeads,
              summativeHeads
            );

            markRows = [
              { rowKey: 'hindi', rowLabel: 'Hindi', ...block.hindi },
              { rowKey: 'marathi', rowLabel: 'Marathi', ...block.marathi },
              { rowKey: 'total', rowLabel: 'Total', ...block.total }
            ];

            const finalRow = block.total;

            return {
              ...entry,
              remarks,
              markRows,
              languageRows: block,
              formativeMarks: finalRow.formativeMarks,
              summativeMarks: finalRow.summativeMarks,
              formativeTotal: finalRow.formativeTotal !== '' ? finalRow.formativeTotal : '',
              summativeTotal: finalRow.summativeTotal !== '' ? finalRow.summativeTotal : '',
              subjectTotal: finalRow.subjectTotal !== '' ? finalRow.subjectTotal : '',
              grade: finalRow.grade || '',
              lastSavedAt: new Date().toLocaleTimeString(),
              updatedBy: user.name
            };
          }
        }

        return entry;
      } else {
        // Standard single-row subject logic
        let formativeMarks = { ...entry.formativeMarks };
        let summativeMarks = { ...entry.summativeMarks };

        const colMeta = currentCols.find(c => c.id === colId);
        if (colMeta?.type === 'fh') {
          formativeMarks[colId] = formattedVal;
        } else if (colMeta?.type === 'sh') {
          summativeMarks[colId] = formattedVal;
        } else if (colId === 'remarks') {
          remarks = value;
        }

        const totals = calculateTotals(formativeMarks, summativeMarks);

        return {
          ...entry,
          formativeMarks,
          summativeMarks,
          remarks,
          ...totals,
          lastSavedAt: new Date().toLocaleTimeString(),
          updatedBy: user.name
        };
      }
    });

    setGridEntries(updated);
    setHasUnsavedChanges(true);
    triggerAutoSave(updated);
  }, [user.name, isHindiMarathiTemplate, formativeHeads, summativeHeads]);

  // --- AUTOMATIC SAVING WITH STATE INDICATORS ---
  const triggerAutoSave = (entries: StudentMarkEntry[]) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      setIsSaving(true);
      saveGridToDatabase(entries);
    }, 2500); // Debounce save for 2.5 seconds
  };

  const saveGridToDatabase = (entries: StudentMarkEntry[], isManualSubmit = false) => {
    if (entries.length === 0) return;
    
    LocalERPDatabase.saveStudentMarkEntries(entries);
    setIsSaving(false);
    setHasUnsavedChanges(false);
    setLastSaved(new Date().toLocaleTimeString());

    if (isManualSubmit) {
      // Log manual save action
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'SAVE_MARK_ENTRIES',
        'Mark Entry Engine',
        `Saved draft marks for Academic Year: ${selectedAcademicYear}, Exam: ${selectedExam}, Class: ${selectedClass}, Subject: ${selectedSubject}`
      );
    }
  };

  // Ensure any pending timers save immediately on component leave
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current && hasUnsavedChanges) {
        clearTimeout(autoSaveTimerRef.current);
        saveGridToDatabase(gridEntries);
      }
    };
  }, [gridEntries, hasUnsavedChanges]);

  // --- SPREADSHEET KEYBOARD NAVIGATION ---
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colId: string,
    langKey?: string
  ) => {
    const currentCols = editableColsRef.current;
    const currentFiltered = filteredEntriesRef.current;
    const colIndex = currentCols.findIndex(c => c.id === colId);
    
    if (isHindiMarathiTemplate && langKey) {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (langKey === 'marathi') {
            setActiveCell({ rowIndex, colId: `${colId}_hindi` });
          } else if (langKey === 'hindi' && rowIndex > 0) {
            setActiveCell({ rowIndex: rowIndex - 1, colId: `${colId}_marathi` });
          }
          break;

        case 'ArrowDown':
        case 'Enter':
          e.preventDefault();
          if (langKey === 'hindi') {
            setActiveCell({ rowIndex, colId: `${colId}_marathi` });
          } else if (langKey === 'marathi' && rowIndex < currentFiltered.length - 1) {
            setActiveCell({ rowIndex: rowIndex + 1, colId: `${colId}_hindi` });
          }
          break;

        case 'ArrowLeft':
          if (e.currentTarget.selectionStart === 0 || e.currentTarget.selectionStart === null) {
            e.preventDefault();
            if (colIndex > 0) {
              setActiveCell({ rowIndex, colId: `${currentCols[colIndex - 1].id}_${langKey}` });
            } else {
              if (langKey === 'marathi') {
                setActiveCell({ rowIndex, colId: `${currentCols[currentCols.length - 1].id}_hindi` });
              } else if (langKey === 'hindi' && rowIndex > 0) {
                setActiveCell({ rowIndex: rowIndex - 1, colId: `${currentCols[currentCols.length - 1].id}_marathi` });
              }
            }
          }
          break;

        case 'ArrowRight':
          if (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.selectionStart === null) {
            e.preventDefault();
            if (colIndex < currentCols.length - 1) {
              setActiveCell({ rowIndex, colId: `${currentCols[colIndex + 1].id}_${langKey}` });
            } else {
              if (langKey === 'hindi') {
                setActiveCell({ rowIndex, colId: `${currentCols[0].id}_marathi` });
              } else if (langKey === 'marathi' && rowIndex < currentFiltered.length - 1) {
                setActiveCell({ rowIndex: rowIndex + 1, colId: `${currentCols[0].id}_hindi` });
              }
            }
          }
          break;

        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            if (colIndex > 0) {
              setActiveCell({ rowIndex, colId: `${currentCols[colIndex - 1].id}_${langKey}` });
            } else {
              if (langKey === 'marathi') {
                setActiveCell({ rowIndex, colId: `${currentCols[currentCols.length - 1].id}_hindi` });
              } else if (langKey === 'hindi' && rowIndex > 0) {
                setActiveCell({ rowIndex: rowIndex - 1, colId: `${currentCols[currentCols.length - 1].id}_marathi` });
              }
            }
          } else {
            if (colIndex < currentCols.length - 1) {
              setActiveCell({ rowIndex, colId: `${currentCols[colIndex + 1].id}_${langKey}` });
            } else {
              if (langKey === 'hindi') {
                setActiveCell({ rowIndex, colId: `${currentCols[0].id}_marathi` });
              } else if (langKey === 'marathi' && rowIndex < currentFiltered.length - 1) {
                setActiveCell({ rowIndex: rowIndex + 1, colId: `${currentCols[0].id}_hindi` });
              }
            }
          }
          break;

        case 'Home':
          e.preventDefault();
          setActiveCell({ rowIndex, colId: `${currentCols[0].id}_${langKey}` });
          break;

        case 'End':
          e.preventDefault();
          setActiveCell({ rowIndex, colId: `${currentCols[currentCols.length - 1].id}_${langKey}` });
          break;

        default:
          break;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setActiveCell({ rowIndex: rowIndex - 1, colId });
        }
        break;

      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        if (rowIndex < currentFiltered.length - 1) {
          setActiveCell({ rowIndex: rowIndex + 1, colId });
        }
        break;

      case 'ArrowLeft':
        if (e.currentTarget.selectionStart === 0 || e.currentTarget.selectionStart === null) {
          e.preventDefault();
          if (colIndex > 0) {
            setActiveCell({ rowIndex, colId: currentCols[colIndex - 1].id });
          } else if (rowIndex > 0) {
            setActiveCell({ rowIndex: rowIndex - 1, colId: currentCols[currentCols.length - 1].id });
          }
        }
        break;

      case 'ArrowRight':
        if (e.currentTarget.selectionStart === e.currentTarget.value.length || e.currentTarget.selectionStart === null) {
          e.preventDefault();
          if (colIndex < currentCols.length - 1) {
            setActiveCell({ rowIndex, colId: currentCols[colIndex + 1].id });
          } else if (rowIndex < currentFiltered.length - 1) {
            setActiveCell({ rowIndex: rowIndex + 1, colId: currentCols[0].id });
          }
        }
        break;

      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (colIndex > 0) {
            setActiveCell({ rowIndex, colId: currentCols[colIndex - 1].id });
          } else if (rowIndex > 0) {
            setActiveCell({ rowIndex: rowIndex - 1, colId: currentCols[currentCols.length - 1].id });
          }
        } else {
          if (colIndex < currentCols.length - 1) {
            setActiveCell({ rowIndex, colId: currentCols[colIndex + 1].id });
          } else if (rowIndex < currentFiltered.length - 1) {
            setActiveCell({ rowIndex: rowIndex + 1, colId: currentCols[0].id });
          }
        }
        break;

      case 'Home':
        e.preventDefault();
        setActiveCell({ rowIndex, colId: currentCols[0].id });
        break;

      case 'End':
        e.preventDefault();
        setActiveCell({ rowIndex, colId: currentCols[currentCols.length - 1].id });
        break;

      case 'PageUp':
        e.preventDefault();
        setActiveCell({ rowIndex: Math.max(0, rowIndex - 10), colId });
        break;

      case 'PageDown':
        e.preventDefault();
        setActiveCell({ rowIndex: Math.min(currentFiltered.length - 1, rowIndex + 10), colId });
        break;

      default:
        break;
    }
  }, [isHindiMarathiTemplate]);

  // Focus the input of the active cell
  useEffect(() => {
    if (activeCell) {
      let refKey = `${activeCell.rowIndex}_${activeCell.colId}`;
      if (isHindiMarathiTemplate) {
        if (activeCell.colId === 'remarks') {
          refKey = `${activeCell.rowIndex}_remarks`;
        } else {
          if (activeCell.colId.endsWith('_hindi')) {
            refKey = `${activeCell.rowIndex}_hindi_${activeCell.colId.slice(0, -6)}`;
          } else if (activeCell.colId.endsWith('_marathi')) {
            refKey = `${activeCell.rowIndex}_marathi_${activeCell.colId.slice(0, -8)}`;
          }
        }
      }
      const element = cellRefs.current[refKey];
      if (element) {
        element.focus();
        element.select(); // Select entire content for immediate typing
      }
    }
  }, [activeCell, isHindiMarathiTemplate]);

  // --- SPREADSHEET EXCEL COPY & PASTE ---
  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>, 
    startRowIndex: number, 
    startColId: string,
    langKey?: 'hindi' | 'marathi'
  ) => {
    if (isRegisterLocked) return;
    e.preventDefault();

    const clipboardText = e.clipboardData.getData('text');
    if (!clipboardText) return;

    saveToHistory(gridEntries);

    // Excel pastes data separated by Tabs (\t) for columns and Newlines (\n) for rows
    const rows = clipboardText.split(/\r?\n/).filter(r => r.length > 0);
    const startColIndex = editableCols.findIndex(c => c.id === startColId);

    const updated = [...gridEntries];

    rows.forEach((rowText, rOffset) => {
      const targetFilteredEntry = filteredEntries[startRowIndex + rOffset];
      if (!targetFilteredEntry) return;

      const targetRowIndexInGrid = updated.findIndex(e => e.id === targetFilteredEntry.id);
      if (targetRowIndexInGrid === -1) return;

      const cells = rowText.split('\t');
      cells.forEach((cellText, cOffset) => {
        const targetColIndex = startColIndex + cOffset;
        if (targetColIndex >= editableCols.length) return; // boundary check

        const targetCol = editableCols[targetColIndex];
        const rawVal = cellText.trim();
        
        let valToSave: number | string = rawVal;
        
        // Validation during paste
        if (targetCol.type === 'fh' || targetCol.type === 'sh') {
          const maxMarks = targetCol.maxMarks || 100;
          const validation = validateCellValue(rawVal, maxMarks);
          if (!validation.isValid) {
            return;
          }
          valToSave = SPECIAL_CODES.some(c => c.code === rawVal.toUpperCase()) 
            ? rawVal.toUpperCase() 
            : rawVal === '' ? '' : Number(rawVal);
        }

        const entry = updated[targetRowIndexInGrid];
        if (isHindiMarathiTemplate && langKey) {
          let markRows = entry.markRows ? [...entry.markRows] : [];
          if (markRows.length === 0) {
            markRows = [
              {
                rowKey: 'hindi',
                rowLabel: 'Hindi',
                formativeMarks: { ...entry.formativeMarks },
                summativeMarks: { ...entry.summativeMarks },
                formativeTotal: '' as number | '',
                summativeTotal: '' as number | '',
                subjectTotal: '' as number | '',
                grade: ''
              },
              {
                rowKey: 'marathi',
                rowLabel: 'Marathi',
                formativeMarks: {},
                summativeMarks: {},
                formativeTotal: '' as number | '',
                summativeTotal: '' as number | '',
                subjectTotal: '' as number | '',
                grade: ''
              },
              {
                rowKey: 'total',
                rowLabel: 'Total',
                formativeMarks: {},
                summativeMarks: {},
                formativeTotal: '' as number | '',
                summativeTotal: '' as number | '',
                subjectTotal: '' as number | '',
                grade: ''
              }
            ];
          } else {
            markRows = markRows.map(row => ({
              ...row,
              formativeMarks: { ...row.formativeMarks },
              summativeMarks: { ...row.summativeMarks }
            }));
          }

          const rowToUpdateIndex = markRows.findIndex(r => r.rowKey === langKey);
          if (rowToUpdateIndex !== -1) {
            const rowToUpdate = markRows[rowToUpdateIndex];
            if (targetCol.type === 'fh') {
              rowToUpdate.formativeMarks[targetCol.id] = valToSave;
            } else if (targetCol.type === 'sh') {
              rowToUpdate.summativeMarks[targetCol.id] = valToSave;
            }

            const hindiRow = markRows.find(r => r.rowKey === 'hindi') || rowToUpdate;
            const marathiRow = markRows.find(r => r.rowKey === 'marathi') || rowToUpdate;

            const block = computeLanguageBlockTotals(
              hindiRow.formativeMarks,
              hindiRow.summativeMarks,
              marathiRow.formativeMarks,
              marathiRow.summativeMarks,
              formativeHeads,
              summativeHeads
            );

            markRows = [
              { rowKey: 'hindi', rowLabel: 'Hindi', ...block.hindi },
              { rowKey: 'marathi', rowLabel: 'Marathi', ...block.marathi },
              { rowKey: 'total', rowLabel: 'Total', ...block.total }
            ];

            const finalRow = block.total;

            updated[targetRowIndexInGrid] = {
              ...entry,
              markRows,
              languageRows: block,
              formativeMarks: finalRow.formativeMarks,
              summativeMarks: finalRow.summativeMarks,
              formativeTotal: typeof finalRow.formativeTotal === 'number' ? finalRow.formativeTotal : 0,
              summativeTotal: typeof finalRow.summativeTotal === 'number' ? finalRow.summativeTotal : 0,
              subjectTotal: typeof finalRow.subjectTotal === 'number' ? finalRow.subjectTotal : 0,
              grade: finalRow.grade || '',
              lastSavedAt: new Date().toLocaleTimeString(),
              updatedBy: user.name
            };
          }
        } else {
          // Standard single row logic
          const formativeMarks = { ...entry.formativeMarks };
          const summativeMarks = { ...entry.summativeMarks };
          let remarks = entry.remarks;

          if (targetCol.type === 'fh') {
            formativeMarks[targetCol.id] = valToSave;
          } else if (targetCol.type === 'sh') {
            summativeMarks[targetCol.id] = valToSave;
          } else if (targetCol.id === 'remarks') {
            remarks = rawVal;
          }

          const totals = calculateTotals(formativeMarks, summativeMarks);
          updated[targetRowIndexInGrid] = {
            ...entry,
            formativeMarks,
            summativeMarks,
            remarks,
            ...totals,
            lastSavedAt: new Date().toLocaleTimeString(),
            updatedBy: user.name
          };
        }
      });
    });

    setGridEntries(updated);
    setHasUnsavedChanges(true);
    triggerAutoSave(updated);
  };

  // --- STUDENT SEARCH & ROW FILTERS ---
  const filteredEntries = useMemo(() => {
    return gridEntries.filter((entry, idx) => {
      // 1. Name/Roll/GR Search Filter
      const term = searchQuery.toLowerCase().trim();
      if (term) {
        const nameMatch = entry.studentName?.toLowerCase().includes(term);
        const rollMatch = entry.rollNumber?.toLowerCase().includes(term);
        const grMatch = entry.grNumber?.toLowerCase().includes(term);
        if (!nameMatch && !rollMatch && !grMatch) return false;
      }

      // 2. Status Filters
      if (filterStatus === 'All') return true;

      const totalFormativeMax = formativeHeads.reduce((sum, h) => sum + h.maxMarks, 0);
      const totalSummativeMax = summativeHeads.reduce((sum, h) => sum + h.maxMarks, 0);

      const hasAbsent = Object.values(entry.formativeMarks).includes('AB') || Object.values(entry.summativeMarks).includes('AB');
      const hasSpecial = Object.values(entry.formativeMarks).some(v => typeof v === 'string' && ['ML', 'EX', 'WH', 'NA'].includes(v)) ||
                          Object.values(entry.summativeMarks).some(v => typeof v === 'string' && ['ML', 'EX', 'WH', 'NA'].includes(v));

      const isPending = formativeHeads.some(h => entry.formativeMarks[h.id] === '') || 
                        summativeHeads.some(h => entry.summativeMarks[h.id] === '');

      if (filterStatus === 'Pending') return isPending;
      if (filterStatus === 'Completed') return !isPending;
      if (filterStatus === 'Absent') return hasAbsent;
      if (filterStatus === 'Special') return hasSpecial;

      return true;
    });
  }, [gridEntries, searchQuery, filterStatus, formativeHeads, summativeHeads]);

  const filteredEntriesRef = useRef(filteredEntries);
  filteredEntriesRef.current = filteredEntries;

  // --- BULK ACTION OPERATIONS ---
  const handleBulkSetMarks = (colId: string, value: string) => {
    if (isRegisterLocked) return;
    saveToHistory(gridEntries);

    const targetCol = editableCols.find(c => c.id === colId);
    if (!targetCol) return;

    const updated = gridEntries.map(entry => {
      let remarks = entry.remarks;

      const formattedVal = SPECIAL_CODES.some(c => c.code === value.toUpperCase().trim()) 
        ? value.toUpperCase().trim() 
        : value === '' ? '' : (isNaN(Number(value)) ? value : Number(value));

      if (isHindiMarathiClasses1To8) {
        const rowDefs = activePattern?.rowDefinitions || [
          { key: 'hindi', label: 'Hindi', type: 'editable' },
          { key: 'marathi', label: 'Marathi', type: 'editable' },
          { key: 'total', label: 'Total', type: 'calculated' }
        ];

        const defaultRows: Record<string, any> = {};
        rowDefs.forEach(r => {
          defaultRows[r.key] = { formativeMarks: {}, summativeMarks: {}, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' };
        });

        const rows = entry.languageRows ? { ...entry.languageRows } : defaultRows;

        const hindiRow = rows.hindi || defaultRows.hindi;
        const marathiRow = rows.marathi || defaultRows.marathi;

        const hindiF = { ...hindiRow.formativeMarks };
        const hindiS = { ...hindiRow.summativeMarks };
        const marathiF = { ...marathiRow.formativeMarks };
        const marathiS = { ...marathiRow.summativeMarks };

        if (targetCol.type === 'fh') {
          hindiF[colId] = formattedVal;
          marathiF[colId] = formattedVal;
        } else if (targetCol.type === 'sh') {
          hindiS[colId] = formattedVal;
          marathiS[colId] = formattedVal;
        } else if (colId === 'remarks') {
          remarks = value;
        }

        const block = computeLanguageBlockTotals(
            hindiF,
            hindiS,
            marathiF,
            marathiS,
            formativeHeads,
            summativeHeads
          );

        const finalRow = block.total;

        return {
          ...entry,
          remarks,
          languageRows: block,
          markRows: [
            { rowKey: 'hindi', rowLabel: 'Hindi', ...block.hindi },
            { rowKey: 'marathi', rowLabel: 'Marathi', ...block.marathi },
            { rowKey: 'total', rowLabel: 'Total', ...block.total }
          ],
          formativeMarks: finalRow.formativeMarks,
          summativeMarks: finalRow.summativeMarks,
          formativeTotal: typeof finalRow.formativeTotal === 'number' ? finalRow.formativeTotal : 0,
          summativeTotal: typeof finalRow.summativeTotal === 'number' ? finalRow.summativeTotal : 0,
          subjectTotal: typeof finalRow.subjectTotal === 'number' ? finalRow.subjectTotal : 0,
          grade: finalRow.grade || '',
          lastSavedAt: new Date().toLocaleTimeString(),
          updatedBy: user.name
        };
      } else {
        let formativeMarks = { ...entry.formativeMarks };
        let summativeMarks = { ...entry.summativeMarks };

        if (targetCol.type === 'fh') {
          formativeMarks[colId] = formattedVal;
        } else if (targetCol.type === 'sh') {
          summativeMarks[colId] = formattedVal;
        } else if (colId === 'remarks') {
          remarks = value;
        }

        const totals = calculateTotals(formativeMarks, summativeMarks);
        return {
          ...entry,
          formativeMarks,
          summativeMarks,
          remarks,
          ...totals,
          lastSavedAt: new Date().toLocaleTimeString(),
          updatedBy: user.name
        };
      }
    });

    setGridEntries(updated);
    setHasUnsavedChanges(true);
    triggerAutoSave(updated);
  };

  const handleBulkClear = (colId: string) => {
    handleBulkSetMarks(colId, '');
  };

  // BLANK EXCEL GENERATION & DOWNLOAD
  const downloadBlankSheet = () => {
    if (!activePattern) return;

    const headers = ['Roll Number', 'G.R. Number', 'Student ID', 'Student Name'];
    if (isHindiMarathiClasses1To8) headers.push('Language');
    formativeHeads.forEach(h => headers.push(`FA: ${h.displayName} (Max ${h.maxMarks})`));
    summativeHeads.forEach(h => headers.push(`SA: ${h.displayName} (Max ${h.maxMarks})`));
    headers.push('Remarks');

    const rows: any[][] = [headers];
    gridEntries.forEach(e => {
      const addRow = (language?: string) => {
        const row: any[] = [e.rollNumber || '', e.grNumber || '', e.studentId, e.studentName];
        if (isHindiMarathiClasses1To8) row.push(language || '');
        formativeHeads.forEach(() => row.push(''));
        summativeHeads.forEach(() => row.push(''));
        row.push('');
        rows.push(row);
      };
      if (isHindiMarathiClasses1To8) ['Hindi', 'Marathi', 'Total'].forEach(addRow);
      else addRow();
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Blank Mark List');
    XLSX.writeFile(workbook, `Classtago_Blank_MarkListA_${selectedClass}_${selectedSubject}.xlsx`);
  };

  // EXPORT CURRENT DATA AS CSV
  const exportCurrentSheet = () => {
    if (!activePattern) return;

    const csvHeaders = ['Roll Number', 'G.R. Number', 'Student ID', 'Student Name'];
    if (isHindiMarathiClasses1To8) {
      csvHeaders.push('Language');
    }
    formativeHeads.forEach(h => csvHeaders.push(`FA: ${h.displayName} (Max ${h.maxMarks})`));
    csvHeaders.push('FA Total');
    summativeHeads.forEach(h => csvHeaders.push(`SA: ${h.displayName} (Max ${h.maxMarks})`));
    if (isHindiMarathiClasses1To8) {
      csvHeaders.push('SA Total', 'Grand Total', 'Grade', 'Remarks');
    } else {
      csvHeaders.push('SA Total', 'Grand Total', 'Remarks');
    }

    const csvRows = [csvHeaders.join(',')];

    gridEntries.forEach(e => {
      if (isHindiMarathiClasses1To8) {
        const rows = e.languageRows || {
          hindi: { formativeMarks: {}, summativeMarks: {}, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' },
          marathi: { formativeMarks: {}, summativeMarks: {}, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' },
          total: { formativeMarks: {}, summativeMarks: {}, formativeTotal: '' as number | '', summativeTotal: '' as number | '', subjectTotal: '' as number | '', grade: '' }
        };

        const keys: ('hindi' | 'marathi' | 'total')[] = ['hindi', 'marathi', 'total'];
        keys.forEach(key => {
          const subRow = rows[key];
          const langLabel = key === 'hindi' ? 'Hindi' : key === 'marathi' ? 'Marathi' : 'Total';
          const row = [
            e.rollNumber || '',
            e.grNumber || '',
            e.studentId,
            `"${e.studentName.replace(/"/g, '""')}"`,
            langLabel
          ];

          formativeHeads.forEach(h => row.push(subRow.formativeMarks[h.id] !== undefined ? subRow.formativeMarks[h.id] : ''));
          row.push(subRow.formativeTotal);

          summativeHeads.forEach(h => row.push(subRow.summativeMarks[h.id] !== undefined ? subRow.summativeMarks[h.id] : ''));
          row.push(subRow.summativeTotal, subRow.subjectTotal, subRow.grade || '', `"${(e.remarks || '').replace(/"/g, '""')}"`);

          csvRows.push(row.join(','));
        });
      } else {
        const row = [
          e.rollNumber || '',
          e.grNumber || '',
          e.studentId,
          `"${e.studentName.replace(/"/g, '""')}"`
        ];

        formativeHeads.forEach(h => row.push(e.formativeMarks[h.id] !== undefined ? e.formativeMarks[h.id] : ''));
        row.push(e.formativeTotal);

        summativeHeads.forEach(h => row.push(e.summativeMarks[h.id] !== undefined ? e.summativeMarks[h.id] : ''));
        row.push(e.summativeTotal, e.subjectTotal, `"${(e.remarks || '').replace(/"/g, '""')}"`);
        
        csvRows.push(row.join(','));
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Export_MarkListA_${selectedClass}_${selectedSubject}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT CURRENT DATA AS MS WORD
  const exportToWord = () => {
    const tableEl = document.getElementById('printable-sheet-table');
    if (!tableEl) {
      alert('Spreadsheet grid not found. Please ensure the register is active.');
      return;
    }
    const tableHTML = tableEl.outerHTML;
    const wordHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Mark List A - Official Print Document</title>
        <style>
          @page { size: A4 landscape; margin: 1in; }
          body { font-family: 'Times New Roman', serif; margin: 0; }
          h2 { text-align: center; font-size: 16pt; margin: 0; text-transform: uppercase; }
          h3 { text-align: center; font-size: 12pt; margin: 2px 0 10px 0; font-weight: normal; }
          .meta-info { margin-bottom: 15px; font-size: 10pt; width: 100%; border-bottom: 2px solid #000; padding-bottom: 5px; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 5px; text-align: center; font-size: 9pt; }
          th { background-color: #f3f4f6; font-weight: bold; }
          .footer-signs { margin-top: 40px; width: 100%; }
          .footer-signs td { border: none; font-size: 10pt; padding: 20px 0; }
        </style>
      </head>
      <body>
        <h2>National High School, Taloda</h2>
        <h3>Academic Assessment Register - MARK LIST A</h3>
        <div class="meta-info">
          <strong>Academic Year:</strong> ${selectedAcademicYear} &nbsp;|&nbsp;
          <strong>Examination:</strong> ${examinations.find(e => e.id === selectedExam)?.name || selectedExam} &nbsp;|&nbsp;
          <strong>Class:</strong> Class ${selectedClass} (${selectedDivision || 'All'}) &nbsp;|&nbsp;
          <strong>Subject:</strong> ${subjects.find(s => s.id === selectedSubject)?.subjectName || selectedSubject}
        </div>
        ${tableHTML}
        <br/><br/>
        <table class="footer-signs">
          <tr>
            <td style="text-align: left; width: 33%;">Prepared By:<br/><strong>Subject Teacher</strong></td>
            <td style="text-align: center; width: 33%;">Checked By:<br/><strong>Class Teacher / Clerk</strong></td>
            <td style="text-align: right; width: 33%;">Countersigned:<br/><strong>Headmaster</strong></td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + wordHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MarkListA_${selectedClass}_${selectedSubject}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // MULTI-LINE TEXT BULK PASTING INTERFACES
  const executeTextImport = () => {
    if (!importText.trim()) {
      setImportError('Please paste some text values from Excel.');
      return;
    }

    try {
      saveToHistory(gridEntries);
      const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      const updated = [...gridEntries];
      let matchCount = 0;

      lines.forEach(line => {
        // Supported format: RollNumber/Name/GRNo followed by marks or tab-separated spreadsheet line
        const parts = line.split('\t');
        if (parts.length < 2) return;

        // Try to identify student by Name, Roll, or GR matching first 2 columns
        const identifier = (parts[0] || '').toLowerCase().trim();
        const studentIndex = updated.findIndex(e => 
          e.studentName?.toLowerCase().includes(identifier) || 
          e.rollNumber?.toLowerCase() === identifier ||
          e.grNumber?.toLowerCase() === identifier
        );

        if (studentIndex >= 0) {
          const entry = updated[studentIndex];
          // Paste columns to evaluation heads
          let partsOffset = 1; // start importing from second index onwards
          
          formativeHeads.forEach((h, idx) => {
            if (partsOffset < parts.length) {
              const rawVal = parts[partsOffset].trim();
              const formattedVal = SPECIAL_CODES.some(c => c.code === rawVal.toUpperCase()) 
                ? rawVal.toUpperCase() 
                : rawVal === '' ? '' : (isNaN(Number(rawVal)) ? rawVal : Number(rawVal));
              entry.formativeMarks[h.id] = formattedVal;
              partsOffset++;
            }
          });

          summativeHeads.forEach((h, idx) => {
            if (partsOffset < parts.length) {
              const rawVal = parts[partsOffset].trim();
              const formattedVal = SPECIAL_CODES.some(c => c.code === rawVal.toUpperCase()) 
                ? rawVal.toUpperCase() 
                : rawVal === '' ? '' : (isNaN(Number(rawVal)) ? rawVal : Number(rawVal));
              entry.summativeMarks[h.id] = formattedVal;
              partsOffset++;
            }
          });

          if (partsOffset < parts.length) {
            entry.remarks = parts[partsOffset].trim();
          }

          const totals = calculateTotals(entry.formativeMarks, entry.summativeMarks);
          updated[studentIndex] = {
            ...entry,
            ...totals,
            lastSavedAt: new Date().toLocaleTimeString(),
            updatedBy: user.name
          };
          matchCount++;
        }
      });

      setGridEntries(updated);
      setHasUnsavedChanges(true);
      triggerAutoSave(updated);
      setShowImportModal(false);
      setImportText('');
      setImportError('');
      alert(`Successfully imported and mapped marks for ${matchCount} students!`);
    } catch (err: any) {
      setImportError(`Import failure: ${err.message || 'Check pasted text alignment.'}`);
    }
  };

  // --- WARNING VALIDATOR BEFORE SUBMIT ---
  const activeWarnings = useMemo(() => {
    const list: string[] = [];
    let missingMarksCount = 0;
    let overflowCount = 0;

    gridEntries.forEach(entry => {
      formativeHeads.forEach(h => {
        const val = entry.formativeMarks[h.id];
        if (val === '') {
          missingMarksCount++;
        } else if (typeof val === 'number' && val > h.maxMarks) {
          overflowCount++;
        }
      });

      summativeHeads.forEach(h => {
        const val = entry.summativeMarks[h.id];
        if (val === '') {
          missingMarksCount++;
        } else if (typeof val === 'number' && val > h.maxMarks) {
          overflowCount++;
        }
      });
    });

    if (missingMarksCount > 0) {
      list.push(`⚠️ Incomplete Draft: ${missingMarksCount} cells are missing evaluation marks.`);
    }
    if (overflowCount > 0) {
      list.push(`❌ Out of bounds mismatch: ${overflowCount} entry values exceed maximum marks limit!`);
    }

    return list;
  }, [gridEntries, formativeHeads, summativeHeads]);

  // --- FINAL SUBMISSION (Lock Subject) ---
  const handleFinalSubmitMarkList = async () => {
    if (activeWarnings.some(w => w.startsWith('❌'))) {
      alert('Cannot final submit! Please fix the errors where marks exceed maximum boundaries.');
      return;
    }

    const confirmMsg = activeWarnings.length > 0 
      ? `There are still warnings in your mark sheet:\n\n${activeWarnings.join('\n')}\n\nAre you sure you want to FINAL SUBMIT? This will LOCK editing capability completely.`
      : "Are you sure you want to FINAL SUBMIT and sign off this Subject's Mark List? You will no longer be able to make changes.";

    if (await requestActionConfirm({ title: 'Final submit mark list?', message: confirmMsg, confirmLabel: 'Final Submit', tone: 'warning' })) {
      const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${selectedSubject}`;
      const newLock: SubjectLockState = {
        id: lockId,
        academicYear: selectedAcademicYear,
        examId: selectedExam,
        classId: selectedClass,
        division: selectedDivision || 'All',
        subjectId: selectedSubject,
        isLocked: true,
        status: 'Submitted',
        lockedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
        lockedBy: user.name
      };

      // 1. Save locked state
      LocalERPDatabase.saveSubjectLockState(newLock);
      setLockState(newLock);

      // 2. Submit all current grid entries as locked
      const submittedEntries = gridEntries.map(e => ({
        ...e,
        status: 'Submitted' as const,
        lastSavedAt: new Date().toLocaleTimeString(),
        updatedBy: user.name
      }));
      setGridEntries(submittedEntries);
      LocalERPDatabase.saveStudentMarkEntries(submittedEntries);
      setHasUnsavedChanges(false);

      // 3. Log Audit
      LocalERPDatabase.addAuditLog(
        user.id,
        user.name,
        user.role,
        'FINAL_SUBMIT_MARKS',
        'Mark Entry Engine',
        `Locked and submitted ${selectedClass} - ${subjects.find(s => s.id === selectedSubject)?.subjectName} examination marks.`
      );

      // Refresh log
      setAuditLogs(LocalERPDatabase.getAuditLogs());
      alert('Mark List A successfully submitted for approval!');
      if (onRefreshData) onRefreshData();
    }
  };

  // --- SOFT DELETE SUBJECT MARK LIST ---
  const handleSoftDeleteSubjectMarkList = async () => {
    if (lockState?.status === 'Approved') {
      alert("This Mark List has already been sent to the Result Book and cannot be deleted.");
      return;
    }

    const confirmDelete = await requestActionConfirm({
      title: lang === 'ur' ? 'مارک لسٹ حذف کریں؟' : lang === 'hi' ? 'मार्क सूची हटाएं?' : 'Delete Mark List?',
      message: lang === 'ur'
        ? "کیا آپ واقعی اس مارک لسٹ کو حذف کرنا چاہتے ہیں؟ اس سے تمام درج شدہ نمبرات صاف ہو جائیں گے اور یہ شیٹ پوشیدہ ہو جائے گی۔"
        : lang === 'hi'
        ? "क्या आप वाकई इस मार्क सूची को हटाना चाहते हैं? इससे सभी दर्ज किए गए अंक मिट जाएंगे और यह शीट छिप जाएगी।"
        : "Are you sure you want to soft-delete this Mark List? This will clear all entries and hide it.",
      confirmLabel: lang === 'ur' ? 'حذف کریں' : lang === 'hi' ? 'हटाएं' : 'Delete Mark List',
      tone: 'danger'
    });
    if (!confirmDelete) return;

    const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${selectedSubject}`;
    const deletedLock: SubjectLockState = {
      ...(lockState || {
        id: lockId,
        academicYear: selectedAcademicYear,
        examId: selectedExam,
        classId: selectedClass,
        division: selectedDivision || 'All',
        subjectId: selectedSubject,
      }),
      status: 'Deleted',
      isLocked: false,
      lockedAt: undefined,
      lockedBy: undefined
    };
    LocalERPDatabase.saveSubjectLockState(deletedLock);

    const allEntries = LocalERPDatabase.getStudentMarkEntriesRaw() || [];
    const entryIdsToUpdate = gridEntries.map(e => e.id);
    const updatedAllEntries = allEntries.map(e => {
      if (entryIdsToUpdate.includes(e.id)) {
        return {
          ...e,
          status: 'Deleted' as any
        };
      }
      return e;
    });
    LocalERPDatabase.saveStudentMarkEntries(updatedAllEntries);

    const resetEntries = gridEntries.map(entry => ({
      ...entry,
      formativeMarks: {},
      summativeMarks: {},
      formativeTotal: 0,
      summativeTotal: 0,
      subjectTotal: 0,
      remarks: '',
      status: 'Draft' as const,
      grade: ''
    }));
    setGridEntries(resetEntries);

    setLockState({
      ...deletedLock,
      status: 'Draft',
      isLocked: false
    });

    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'SOFT_DELETE_MARK_LIST',
      'Mark Entry Engine',
      `Soft-deleted mark list for ${selectedClass} - ${subjects.find(s => s.id === selectedSubject)?.subjectName || selectedSubject}`
    );

    setAuditLogs(LocalERPDatabase.getAuditLogs());
    alert(
      lang === 'ur' 
        ? "مارک لسٹ کامیابی سے حذف کر دی گئی۔" 
        : lang === 'hi'
        ? "मार्क सूची सफलतापूर्वक हटा दी गई।"
        : "Mark List soft-deleted successfully."
    );
    if (onRefreshData) onRefreshData();
  };

  // --- APPROVAL WORKFLOW BY HEADMASTER ---
  const handleHeadmasterApprove = () => {
    const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${selectedSubject}`;
    const newLock: SubjectLockState = {
      ...(lockState || {}),
      id: lockId,
      academicYear: selectedAcademicYear,
      examId: selectedExam,
      classId: selectedClass,
      division: selectedDivision || 'All',
      subjectId: selectedSubject,
      isLocked: true,
      status: 'Approved',
      lockedAt: lockState?.lockedAt || new Date().toLocaleString(),
      lockedBy: lockState?.lockedBy || user.name
    };

    LocalERPDatabase.saveSubjectLockState(newLock);
    setLockState(newLock);

    // Update entries status to Submitted/Approved
    const approvedEntries = gridEntries.map(e => ({
      ...e,
      status: 'Submitted' as const,
      lastSavedAt: new Date().toLocaleTimeString(),
      updatedBy: user.name
    }));
    setGridEntries(approvedEntries);
    LocalERPDatabase.saveStudentMarkEntries(approvedEntries);

    // Log Audit
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'APPROVE_SUBJECT_MARKS',
      'Mark Entry Engine',
      `Approved and signed off evaluation marks for Class ${selectedClass} - Subject ${subjects.find(s => s.id === selectedSubject)?.subjectName}.`
    );

    setAuditLogs(LocalERPDatabase.getAuditLogs());
    alert('Mark Register successfully APPROVED! Marks are now synchronized with the Result Book.');
    if (onRefreshData) onRefreshData();
  };

  // --- RETURN FOR CORRECTION WORKFLOW BY HEADMASTER ---
  const handleHeadmasterReturn = (reason: string) => {
    if (!reason.trim()) {
      alert('Please specify a return correction reason.');
      return;
    }

    const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${selectedSubject}`;
    const returnedLock: SubjectLockState = {
      id: lockId,
      academicYear: selectedAcademicYear,
      examId: selectedExam,
      classId: selectedClass,
      division: selectedDivision || 'All',
      subjectId: selectedSubject,
      isLocked: false, // Unlock for edits!
      status: 'Returned',
      returnReason: reason,
      unlockedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      unlockedBy: user.name
    };

    LocalERPDatabase.saveSubjectLockState(returnedLock);
    setLockState(returnedLock);

    // Revert entries back to Draft status so teacher can edit them
    const draftEntries = gridEntries.map(e => ({
      ...e,
      status: 'Draft' as const,
      lastSavedAt: new Date().toLocaleTimeString(),
      updatedBy: user.name
    }));
    setGridEntries(draftEntries);
    LocalERPDatabase.saveStudentMarkEntries(draftEntries);

    // Add audit
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'RETURN_SUBJECT_MARKS',
      'Mark Entry Engine',
      `Returned marks list for Class ${selectedClass} Subject ${subjects.find(s => s.id === selectedSubject)?.subjectName} for correction. Reason: "${reason}"`
    );

    setAuditLogs(LocalERPDatabase.getAuditLogs());
    setShowReturnModal(false);
    setReturnReason('');
    alert('Marks successfully returned to the Teacher for corrections.');
    if (onRefreshData) onRefreshData();
  };

  // --- UNLOCK WORKFLOW BY HEADMASTER ---
  const handleHeadmasterUnlock = () => {
    if (!unlockReason.trim()) {
      alert('Please specify a valid unlock explanation reason for auditing.');
      return;
    }

    const lockId = `lock_${selectedAcademicYear}_${selectedExam}_${selectedClass}_${selectedDivision || 'All'}_${selectedSubject}`;
    const unlocked: SubjectLockState = {
      id: lockId,
      academicYear: selectedAcademicYear,
      examId: selectedExam,
      classId: selectedClass,
      division: selectedDivision || 'All',
      subjectId: selectedSubject,
      isLocked: false,
      status: 'Draft',
      unlockedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      unlockedBy: user.name,
      unlockReason: unlockReason
    };

    // 1. Save Unlocked State
    LocalERPDatabase.saveSubjectLockState(unlocked);
    setLockState(unlocked);

    // 2. Roll back Entries to Draft status
    const draftEntries = gridEntries.map(e => ({
      ...e,
      status: 'Draft' as const,
      lastSavedAt: new Date().toLocaleTimeString(),
      updatedBy: user.name
    }));
    setGridEntries(draftEntries);
    LocalERPDatabase.saveStudentMarkEntries(draftEntries);

    // 3. Audit Logging
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      'UNLOCK_SUBJECT_MARKS',
      'Mark Entry Engine',
      `Headmaster ${user.name} unlocked marks for Class ${selectedClass} Subject ${subjects.find(s => s.id === selectedSubject)?.subjectName}. Reason: "${unlockReason}"`
    );

    // Refresh audits
    setAuditLogs(LocalERPDatabase.getAuditLogs());
    setShowUnlockModal(false);
    setUnlockReason('');
    alert('Mark Register successfully unlocked! Teachers can now make corrections.');
    if (onRefreshData) onRefreshData();
  };

  // Filter logs for this specific locked combo
  const currentSubjectAudits = useMemo(() => {
    const term = `${selectedClass}`;
    const subjName = subjects.find(s => s.id === selectedSubject)?.subjectName || '';
    return auditLogs.filter(log => 
      log.module === 'Mark Entry Engine' && 
      (log.details.includes(term) || log.details.includes(subjName))
    );
  }, [auditLogs, selectedClass, selectedSubject, subjects]);

  // Dynamically inject print-specific CSS rules for custom size/orientation and color profile
  useEffect(() => {
    const styleId = 'dynamic-print-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${pageSize.toLowerCase()} ${printOrientation.toLowerCase()};
          margin: 10mm;
        }
        body {
          -webkit-print-color-adjust: ${printTheme === 'color' ? 'exact' : 'economy'} !important;
          print-color-adjust: ${printTheme === 'color' ? 'exact' : 'economy'} !important;
        }
        ${printTheme === 'monochrome' ? `
          * {
            background-color: transparent !important;
            color: #000 !important;
            border-color: #000 !important;
          }
          .bg-indigo-50, .bg-slate-50, .bg-blue-50, .bg-emerald-50, .bg-rose-50 {
            background-color: transparent !important;
          }
        ` : ''}
      }
    `;
    return () => {
      styleEl?.remove();
    };
  }, [pageSize, printOrientation, printTheme]);

  return (
    <div className="space-y-6">

      {/* --- NOTIFICATIONS & REAL-TIME EVENT FEEDS (No-Print) --- */}
      {!readOnlyMode && notifications.length > 0 && (
        <div className="no-print space-y-2">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all animate-fade-in ${
                notif.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' 
                  : notif.type === 'warn'
                  ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm'
              }`}
            >
              <Bell className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                notif.type === 'success' ? 'text-emerald-600' : notif.type === 'warn' ? 'text-amber-600' : 'text-indigo-600'
              }`} />
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs uppercase tracking-wider">{notif.title}</span>
                  <span className="text-[9px] opacity-60 font-mono font-bold uppercase">{notif.date}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">{notif.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- WORKSPACE SUB-ANALYTICS BANNERS (No-Print) --- */}
      {!readOnlyMode && activePattern && (
        <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* BANNER A: SUBJECT COMPLETION PERCENTAGE STATUS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Evaluation Completion Tracker</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase ${
                completionMetrics.percent === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {completionMetrics.percent}% Filled
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-bold">Active Subject Name:</span>
                <span className="font-black text-indigo-900 font-mono">
                  {subjects.find(s => s.id === selectedSubject)?.subjectName || 'Select Subject'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                <div className="p-1.5 bg-slate-50 rounded border">
                  <span className="block text-xs font-black text-slate-800">{completionMetrics.total}</span>
                  <span className="text-slate-400">Total Students</span>
                </div>
                <div className="p-1.5 bg-emerald-50/50 rounded border border-emerald-100 text-emerald-900">
                  <span className="block text-xs font-black">{completionMetrics.completed}</span>
                  <span className="text-emerald-500">Marks Entered</span>
                </div>
                <div className="p-1.5 bg-rose-50/50 rounded border border-rose-100 text-rose-900">
                  <span className="block text-xs font-black">{completionMetrics.pending}</span>
                  <span className="text-rose-500">Marks Pending</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    completionMetrics.percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${completionMetrics.percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* BANNER B: CLASS-WISE RESULT SYSTEM STATUS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Class Compilation Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono uppercase ${
                classResultStatus.status === 'Result Ready' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-amber-100 text-amber-800'
              }`}>
                {classResultStatus.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-bold">Approved Registers:</span>
                <span className="font-black text-slate-800 font-mono">{classResultStatus.approvedCount} / {classResultStatus.totalCount} subjects</span>
              </div>

              {classResultStatus.status === 'Result Ready' ? (
                <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-medium">
                  ✓ Excellent! All subjects of Class {selectedClass} are officially verified, approved, and synchronized. The school ledger is ready for compiling the final Result Book.
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider block">Pending Subject Evaluations:</span>
                  <div className="flex flex-wrap gap-1 max-h-[50px] overflow-y-auto">
                    {classResultStatus.pendingSubjects.map((subName, i) => (
                      <span key={i} className="text-[9px] bg-rose-50 border border-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold font-sans">
                        {subName}
                      </span>
                    ))}
                    {classResultStatus.pendingSubjects.length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">No remaining subjects are pending evaluation.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
      
      {/* SECTION 1: MASTER FILTERS & SELECTION (No-Print) */}
      {!readOnlyMode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 no-print">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Active Assessment Register Config</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* SAVED TIMESTAMPS */}
            {hasUnsavedChanges ? (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-bold animate-pulse">
                ⏳ Unsaved Changes
              </span>
            ) : lastSaved ? (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                ✓ Draft Auto-Saved ({lastSaved})
              </span>
            ) : null}

            {isSaving && (
              <span className="text-[10px] text-slate-400 italic">
                Saving to Cloud...
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Session</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 font-bold cursor-pointer focus:bg-white"
            >
              <option value="2026-27">2026-27</option>
              <option value="2025-26">2025-26</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Examination Term</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 font-bold cursor-pointer focus:bg-white"
            >
              {examinations.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Grade / Class Level</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 font-bold cursor-pointer focus:bg-white"
            >
              {Array.from(new Set(allowedClasses.map(c => c.className))).map(clsName => (
                <option key={clsName} value={clsName}>{clsName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Division Track</label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 font-bold cursor-pointer focus:bg-white"
            >
              <option value="">No Division / Default</option>
              <option value="A">Division A</option>
              <option value="B">Division B</option>
              <option value="Urdu Medium">Urdu Medium</option>
              <option value="Science">Science</option>
              <option value="Commerce">Commerce</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mapped Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 border-indigo-200 rounded-lg text-xs bg-indigo-50 text-indigo-900 font-black cursor-pointer focus:bg-white"
            >
              {allowedSubjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.subjectName}</option>
              ))}
              {allowedSubjects.length === 0 && <option value="">No Assigned Subjects</option>}
            </select>
          </div>
        </div>

        {autoLoadedMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex items-center justify-between font-medium">
            <div className="flex items-center gap-1.5">
              <CheckSquare2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{autoLoadedMessage}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                {activePattern?.subjectType} Layout
              </span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* SECTION 2: LOCK / ACTION BANNER */}
      {lockState && (
        <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm ${
          lockState.status === 'Approved' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : lockState.status === 'Submitted'
            ? 'bg-amber-50 border-amber-200 text-amber-950 animate-pulse'
            : lockState.status === 'Returned'
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : 'bg-indigo-50 border-indigo-100 text-indigo-950'
        }`}>
          <div className="flex items-start gap-3">
            {lockState.status === 'Approved' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : lockState.status === 'Submitted' ? (
              <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : lockState.status === 'Returned' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : lockState.isLocked ? (
              <Lock className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Unlock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider">
                {lockState.status === 'Approved' ? '✅ Register Approved & Finalized' :
                 lockState.status === 'Submitted' ? '📥 Submitted & Awaiting Final Sign-off' :
                 lockState.status === 'Returned' ? '⚠️ Returned to Teacher for Corrections' :
                 lockState.isLocked ? '🔒 This Mark Register is Finalized & Locked' : '✏️ Draft Edit Mode Enabled'}
              </h3>
              <p className="text-[11px] opacity-90 leading-relaxed max-w-2xl">
                {lockState.status === 'Approved' ? `Approved and countersigned by Headmaster on ${lockState.unlockedAt || lockState.lockedAt}. Data is fully synchronized with the school's central Result Book.` :
                 lockState.status === 'Submitted' ? `Submitted by Teacher ${lockState.lockedBy} on ${lockState.lockedAt}. Awaiting supervisory review, verification, and countersign by Headmaster.` :
                 lockState.status === 'Returned' ? `Returned to Teacher on ${lockState.unlockedAt} with directive: "${lockState.returnReason}"` :
                 lockState.isLocked ? `Signed off by teacher ${lockState.lockedBy} on ${lockState.lockedAt}.` :
                 "All entered marks are saved instantly in local memory as a Draft. Standard numeric validation and special absent codes are active."
                }
                {lockState.unlockReason && lockState.status !== 'Returned' && (
                  <span className="block mt-1 font-serif text-[10px] bg-white/60 p-1.5 rounded-lg border border-slate-200 text-slate-700">
                    <strong>Last Unlock Audit Reason:</strong> "{lockState.unlockReason}" (unlocked by {lockState.unlockedBy} on {lockState.unlockedAt})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 flex-shrink-0 items-center">
            
            {/* HEADMASTER APPROVAL & CORRECTION CONTROLS */}
            {!readOnlyMode && lockState.status === 'Submitted' && user.role === 'headmaster' && (
              <>
                <button
                  onClick={handleHeadmasterApprove}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Sync</span>
                </button>
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Return Correction</span>
                </button>
              </>
            )}

            {/* HEADMASTER UNLOCK CONTROLS */}
            {!readOnlyMode && (lockState.status === 'Approved' || lockState.isLocked) && user.role === 'headmaster' && (
              <button
                onClick={() => setShowUnlockModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Audited Unlock</span>
              </button>
            )}

            {/* TEACHER SUBMIT CONTROLS */}
            {!readOnlyMode && lockState.status !== 'Approved' && lockState.status !== 'Submitted' && !lockState.isLocked && (
              <button
                onClick={handleFinalSubmitMarkList}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Final Submit (Lock)</span>
              </button>
            )}

            {/* GLOBAL REVENUE & PRINT CENTER TOGGLE */}
            {!readOnlyMode && (
              <button
                onClick={() => { setActiveReportTab('subj'); setShowReportsCenter(true); }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Reports & Print</span>
              </button>
            )}

            {/* SOFT DELETE CONTROLS */}
            {!readOnlyMode && (
              lockState.status === 'Approved' ? (
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200"
                  title="This Mark List has already been sent to the Result Book and is locked against deletion."
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{lang === 'ur' ? 'لاک شدہ' : lang === 'hi' ? 'लॉक किया गया' : 'Locked in Result Book'}</span>
                </div>
              ) : (
                <button type="button"
                  onClick={handleSoftDeleteSubjectMarkList}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ur' ? 'حذف کریں' : lang === 'hi' ? 'हटाएं' : 'Delete Mark List'}</span>
                </button>
              )
            )}

            <button
              onClick={() => setShowAuditsPanel(!showAuditsPanel)}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showAuditsPanel ? 'Hide History' : 'Audits'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: AUDITS HISTORY PANEL */}
      {showAuditsPanel && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3 animate-fade-in no-print text-xs">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Audit logs for {selectedClass}</span>
            <button onClick={() => setShowAuditsPanel(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto font-mono text-[10px]">
            {currentSubjectAudits.map((log, idx) => (
              <div key={log.id || idx} className="p-2 bg-white rounded border border-slate-100 flex items-start gap-4">
                <span className="text-slate-400 font-sans">{log.timestamp}</span>
                <span className="text-indigo-600 font-sans font-bold uppercase">[{log.action}]</span>
                <span className="text-slate-600 font-sans">by {log.userName} ({log.role}):</span>
                <span className="text-slate-800 flex-1">{log.details}</span>
              </div>
            ))}
            {currentSubjectAudits.length === 0 && (
              <p className="text-center p-4 italic text-slate-400">No modification or sign-off records found for this active parameters.</p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: WARN INDICATOR */}
      {activeWarnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900 font-semibold no-print">
          {activeWarnings.map((w, idx) => (
            <p key={idx} className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>{w}</span>
            </p>
          ))}
        </div>
      )}

      {/* SECTION 5: REGISTER ACTIONS & OPERATIONS BAR (No-Print) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4 no-print">
        
        {/* Undo/Redo & Search Inputs */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyStack.length === 0 || isRegisterLocked}
              className="p-1.5 text-slate-600 hover:bg-white rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0 || isRegisterLocked}
              className="p-1.5 text-slate-600 hover:bg-white rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 w-48 transition-all"
              placeholder="Search by student, roll, GR..."
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-600 focus:bg-white cursor-pointer"
            >
              <option value="All">All Student Rows</option>
              <option value="Pending">Pending Evaluation Marks</option>
              <option value="Completed">Completed All Heads</option>
              <option value="Absent">Absent Students (AB)</option>
              <option value="Special">Special Exempt Cases (ML/EX/WH/NA)</option>
            </select>
          </div>
        </div>

        {/* Excel sheets operations */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setShowImportModal(true)}
            disabled={isRegisterLocked}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold disabled:opacity-40 transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Paste Excel Marks</span>
          </button>

          <button
            onClick={downloadBlankSheet}
            className="flex items-center gap-1.5 px-3 py-1.5 border hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Blank Excel Layout</span>
          </button>

          <button
            onClick={exportCurrentSheet}
            className="flex items-center gap-1.5 px-3 py-1.5 border hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

        </div>
      </div>

      {/* SECTION 6: THE SPREADSHEET REGISTER GRID CONTAINER */}
      {activePattern && activeTemplate ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Print Letterhead layout */}
          <div className="print-only">
            <PrintLetterhead lang={activeTemplate.isRTL ? 'ur' : 'en'} subtitle="National High School, Taloda / نیشنل ہائی اسکول تلوڈا" />
            <div className="text-center my-4 border-b pb-2">
              <h2 className="text-md font-black uppercase text-slate-900">
                {activeTemplate.isRTL ? 'نشانات رجسٹر (فہرست الف)' : 'EXAMINATION RECORD SHEET (REGISTER LIST A)'}
              </h2>
              <div className="flex justify-center gap-6 text-xs text-slate-600 font-mono mt-1">
                <span>AY: {selectedAcademicYear}</span>
                <span>Term: {examinations.find(e => e.id === selectedExam)?.name}</span>
                <span>Class Level: {selectedClass} ({selectedDivision || 'Default'})</span>
                <span>Subject Name: {subjects.find(s => s.id === selectedSubject)?.subjectName}</span>
              </div>
            </div>
          </div>

          <div className={`${readOnlyMode ? 'overflow-visible' : 'max-h-[600px] overflow-auto'} relative will-change-scroll`}>
            <table id="printable-sheet-table" className="w-full border-collapse text-left table-fixed">
              
              {/* STICKY COLUMN FROZEN HEADERS */}
              <thead className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
                <tr>
                  
                  {/* FROZEN HEADERS FOR STUDENT BIO */}
                  {!excludeStudentId && (
                    <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider w-16 text-center sticky left-0 bg-slate-50 z-40 border-r">
                      Roll No
                    </th>
                  )}
                  {!excludeGrNumber && (
                    <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider w-24 text-center sticky left-16 bg-slate-50 z-40 border-r">
                      G.R. No
                    </th>
                  )}
                  <th className={`p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider w-48 sticky bg-slate-50 z-40 border-r ${
                    excludeStudentId && excludeGrNumber ? 'left-0' : excludeStudentId ? 'left-0' : excludeGrNumber ? 'left-16' : 'left-40'
                  }`}>
                    Student Name
                  </th>
                  {isHindiMarathiTemplate && (
                    <th className="p-3 text-[10px] font-black uppercase text-slate-500 tracking-wider w-24 text-center bg-slate-50 border-r">
                      Language
                    </th>
                  )}

                  {/* FORMATIVE EVALUATION HEADS */}
                  {formativeHeads.map(h => (
                    <th key={h.id} className="p-3 text-center border-r w-32 bg-slate-50/80">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold text-indigo-700 block truncate" title={h.displayName}>
                          {h.displayName}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          Max: {h.maxMarks}M
                        </span>
                        
                        {/* BULK SET TRIGGER BUTTONS (No-Print) */}
                        {!isRegisterLocked && (
                          <div className="flex justify-center gap-1 mt-1 no-print">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleBulkSetMarks(h.id, e.target.value);
                                  e.target.value = ''; // clear
                                }
                              }}
                              className="text-[9px] bg-white border rounded text-slate-500 px-1 py-0.5 focus:outline-none cursor-pointer"
                              title="Bulk Assign Code"
                            >
                              <option value="">Bulk Code</option>
                              {SPECIAL_CODES.map(c => (
                                <option key={c.code} value={c.code}>{c.code}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleBulkClear(h.id)}
                              className="text-[9px] bg-white border hover:bg-rose-50 text-rose-600 rounded px-1.5 py-0.5"
                              title="Clear Col"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}

                  <th className="p-3 text-center border-r w-24 bg-indigo-50/50">
                    <span className="text-[10px] font-bold text-indigo-900 block uppercase">FA Total</span>
                    <span className="text-[9px] text-slate-400 block font-mono">Max: {formativeHeads.reduce((sum, h) => sum + h.maxMarks, 0)}M</span>
                  </th>

                  {/* SUMMATIVE EVALUATION HEADS */}
                  {summativeHeads.map(h => (
                    <th key={h.id} className="p-3 text-center border-r w-32 bg-slate-50/80">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-extrabold text-blue-700 block truncate" title={h.displayName}>
                          {h.displayName}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          Max: {h.maxMarks}M
                        </span>

                        {!isRegisterLocked && (
                          <div className="flex justify-center gap-1 mt-1 no-print">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleBulkSetMarks(h.id, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              className="text-[9px] bg-white border rounded text-slate-500 px-1 py-0.5 focus:outline-none cursor-pointer"
                            >
                              <option value="">Bulk Code</option>
                              {SPECIAL_CODES.map(c => (
                                <option key={c.code} value={c.code}>{c.code}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleBulkClear(h.id)}
                              className="text-[9px] bg-white border hover:bg-rose-50 text-rose-600 rounded px-1.5 py-0.5"
                            >
                              Clear
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}

                  <th className="p-3 text-center border-r w-24 bg-blue-50/50">
                    <span className="text-[10px] font-bold text-blue-900 block uppercase">SA Total</span>
                    <span className="text-[9px] text-slate-400 block font-mono">Max: {summativeHeads.reduce((sum, h) => sum + h.maxMarks, 0)}M</span>
                  </th>

                  <th className="p-3 text-center border-r w-28 bg-emerald-50">
                    <span className="text-[10px] font-extrabold text-emerald-900 block uppercase">Grand Total</span>
                    <span className="text-[9px] text-slate-400 block font-mono">
                      Max: {isHindiMarathiTemplate 
                        ? 2 * (formativeHeads.reduce((sum, h) => sum + h.maxMarks, 0) + summativeHeads.reduce((sum, h) => sum + h.maxMarks, 0)) 
                        : (formativeHeads.reduce((sum, h) => sum + h.maxMarks, 0) + summativeHeads.reduce((sum, h) => sum + h.maxMarks, 0))
                      }M
                    </span>
                  </th>

                  {isHindiMarathiTemplate && (
                    <th className="p-3 text-center border-r w-24 bg-slate-50">
                      <span className="text-[10px] font-extrabold text-slate-900 block uppercase">Grade</span>
                    </th>
                  )}

                  {!excludeRemarks && (
                    <th className="p-3 w-48 text-center bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">Teacher Remarks</span>
                    </th>
                  )}

                </tr>
              </thead>

              {/* GRID STUDENT ROWS */}
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.map((entry, rowIndex) => (
                  <SmartMarkListRow
                    key={entry.id}
                    entry={entry}
                    rowIndex={rowIndex}
                    isHindiMarathiTemplate={isHindiMarathiTemplate}
                    formativeHeads={formativeHeads}
                    summativeHeads={summativeHeads}
                    excludeStudentId={excludeStudentId}
                    excludeGrNumber={excludeGrNumber}
                    excludeRemarks={excludeRemarks}
                    isRegisterLocked={isRegisterLocked}
                    isRowActive={activeCell?.rowIndex === rowIndex}
                    activeColId={activeCell?.rowIndex === rowIndex ? activeCell.colId : null}
                    passingMarks={activePattern?.passingMarks}
                    cellRefs={cellRefs}
                    updateCell={updateCell}
                    setActiveCell={setActiveCell}
                    handlePaste={handlePaste}
                    handleKeyDown={handleKeyDown}
                  />
                ))}

                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={editableCols.length + 4 - (excludeStudentId ? 1 : 0) - (excludeGrNumber ? 1 : 0) - (excludeRemarks ? 1 : 0) + (isHindiMarathiTemplate ? 2 : 0)} className="p-12 text-center text-slate-400 italic text-xs">
                      No matching student register records found. Adjust criteria search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* SIGNATURE SECTIONS FOR PRINT OUTS */}
          <div className="print-only mt-12 border-t pt-8">
            <PrintSignatureArea lang={activeTemplate.isRTL ? 'ur' : 'en'} />
          </div>

        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-16 text-center text-slate-400 space-y-3 shadow-sm">
          <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-xs italic">Please select Academic session, Exam, Class, Division, and Subject to fetch standard register layout templates.</p>
        </div>
      )}

      {/* SECTION 7: EXPLAINER CARD OF SPECIAL CODES (No-Print) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 no-print text-xs">
        <h3 className="font-extrabold uppercase text-slate-700 text-[10px] tracking-wider flex items-center gap-1.5">
          <Info className="w-4 h-4 text-indigo-500" />
          <span>Configured School Assessment Special Codes Guide</span>
        </h3>
        <p className="text-slate-500 text-[11px]">
          Typing these codes into any evaluation cell bypasses numeric limits, maps appropriately into progress books, and treats numeric sums logically:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
          {SPECIAL_CODES.map(item => (
            <div key={item.code} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-black font-mono text-indigo-700 text-xs px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded">{item.code}</span>
              <p className="text-[10px] font-extrabold text-slate-700">{item.label}</p>
              <p className="text-[9px] text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- WORKFLOW MODAL: EXCEL BULK PASTE --- */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-fade-in no-print text-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <span className="text-xs font-extrabold uppercase text-slate-700">Paste Bulk Excel Columns</span>
              <button onClick={() => { setShowImportModal(false); setImportText(''); setImportError(''); }} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">How to use:</p>
                <ol className="list-decimal list-inside text-slate-500 space-y-0.5 leading-relaxed text-[11px]">
                  <li>Open your Excel sheet. Select the student column along with marks.</li>
                  <li>Copy the rows (Ctrl+C).</li>
                  <li>Paste the raw text block into the container below (Ctrl+V).</li>
                  <li>The system parses names/roll numbers automatically and merges marks!</li>
                </ol>
              </div>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-48 border border-slate-200 rounded-lg p-3 text-xs bg-slate-50 font-mono focus:bg-white focus:outline-none"
                placeholder="Roll 1&#9;15&#9;42&#10;Roll 2&#9;AB&#9;35&#10;..."
              />

              {importError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-[10px] font-bold">
                  {importError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => { setShowImportModal(false); setImportText(''); setImportError(''); }}
                  className="px-3.5 py-1.5 border hover:bg-slate-50 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={executeTextImport}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                >
                  Parse & Map Marks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- WORKFLOW MODAL: HEADMASTER RETURN FOR CORRECTION --- */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-fade-in no-print text-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-amber-50 text-amber-900">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Return Mark List for Correction</span>
              </span>
              <button onClick={() => { setShowReturnModal(false); setReturnReason(''); }} className="p-1 hover:bg-amber-100 rounded text-amber-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[11px] text-amber-800">
                <p className="font-extrabold uppercase">CORRECTION DIRECTIVE FOR TEACHER:</p>
                <p className="leading-relaxed">
                  Provide precise feedback on why these evaluation marks are returned. The teacher will be permitted to edit and resubmit, and this directive will be permanently stored in logs.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Correction Feedback / Directives *</label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full h-24 border border-slate-200 rounded-lg p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none font-medium"
                  placeholder="e.g. Please verify the summative grades for roll numbers 4 and 12, as written scores appear mismatched with original sheets..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => { setShowReturnModal(false); setReturnReason(''); }}
                  className="px-3.5 py-1.5 border hover:bg-slate-50 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleHeadmasterReturn(returnReason)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-sm"
                >
                  Return to Teacher
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- WORKFLOW MODAL: HEADMASTER AUDITED UNLOCK --- */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-fade-in no-print text-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between bg-rose-50 text-rose-900">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-4 h-4 text-rose-600" />
                <span>Audited Mark Register Unlock</span>
              </span>
              <button onClick={() => { setShowUnlockModal(false); setUnlockReason(''); }} className="p-1 hover:bg-rose-100 rounded text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1 text-[11px] text-rose-800">
                <p className="font-extrabold uppercase">CRITICAL SYSTEM DIRECTIVE:</p>
                <p className="leading-relaxed">
                  Unlocking a finalized exam mark register is an audited action. Both old and new values are tracked. The specified reason will be permanently saved in the system's database logs.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Official Modification Reason *</label>
                <textarea
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  className="w-full h-24 border border-slate-200 rounded-lg p-3 text-xs bg-slate-50 focus:bg-white focus:outline-none font-medium"
                  placeholder="e.g. Approved re-evaluation request for class-average corrections due to written exam grade updates..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  onClick={() => { setShowUnlockModal(false); setUnlockReason(''); }}
                  className="px-3.5 py-1.5 border hover:bg-slate-50 text-slate-600 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleHeadmasterUnlock}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm"
                >
                  Authorize Unlock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADMINISTRATIVE REPORTS & PRINT CENTER --- */}
      <MarkListReportsAndPrint
        isOpen={showReportsCenter}
        onClose={() => setShowReportsCenter(false)}
        activeTab={activeReportTab}
        setActiveTab={setActiveReportTab}
        selectedAcademicYear={selectedAcademicYear}
        selectedExam={selectedExam}
        selectedClass={selectedClass}
        selectedDivision={selectedDivision}
        selectedSubject={selectedSubject}
        gridEntries={gridEntries}
        subjects={subjects}
        examinations={examinations}
        classes={classes}
        user={user}
        pageSize={pageSize}
        setPageSize={(size) => setPageSize(size as any)}
        printOrientation={printOrientation}
        setPrintOrientation={(ori) => setPrintOrientation(ori as any)}
        printTheme={printTheme}
        setPrintTheme={(theme) => setPrintTheme(theme as any)}
        excludeStudentId={excludeStudentId}
        setExcludeStudentId={setExcludeStudentId}
        excludeGrNumber={excludeGrNumber}
        setExcludeGrNumber={setExcludeGrNumber}
        excludeRemarks={excludeRemarks}
        setExcludeRemarks={setExcludeRemarks}
        exportToWord={exportToWord}
        exportToCsv={exportCurrentSheet}
      />

    </div>
  );
}
