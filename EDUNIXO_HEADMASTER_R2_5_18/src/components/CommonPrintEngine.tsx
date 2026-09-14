import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Printer, Download, X, ArrowLeft, Info, FileText } from 'lucide-react';
import { Language, User } from '../types';
import { LocalERPDatabase } from '../lib/supabase';
import { openSmartPrint } from '../lib/smartPrint';

// High-fidelity OKLCH to RGB translations (prevent gray screens/crashes in html2canvas)
function oklchToRgb(oklchStr: string): string | null {
  const match = oklchStr.match(/oklch\(([^)]+)\)/);
  if (!match) return null;
  
  const parts = match[1].trim().split(/[\s,/]+/);
  if (parts.length < 3) return null;
  
  let l = parseFloat(parts[0]);
  if (parts[0].includes('%')) l /= 100;
  
  let c = parseFloat(parts[1]);
  if (parts[1].includes('%')) c /= 100;
  
  let h = parseFloat(parts[2]);
  if (parts[2].includes('deg')) h = parseFloat(parts[2]);
  if (parts[2].includes('rad')) h = parseFloat(parts[2]) * 180 / Math.PI;
  if (parts[2].includes('turn')) h = parseFloat(parts[2]) * 360;
  
  let a = 1;
  if (parts.length >= 4) {
    a = parseFloat(parts[3]);
    if (parts[3].includes('%')) a /= 100;
  }
  
  const hRad = (h * Math.PI) / 180;
  const L = l;
  const oklab_a = c * Math.cos(hRad);
  const oklab_b = c * Math.sin(hRad);
  
  const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
  const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
  const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
  
  const l_cubed = l_ * l_ * l_;
  const m_cubed = m_ * m_ * m_;
  const s_cubed = s_ * s_ * s_;
  
  const r_lin = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
  const g_lin = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
  const b_lin = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.7076286104 * s_cubed;
  
  const toSRGB = (val: number) => {
    if (val <= 0.0031308) return val * 12.92;
    return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
  };
  
  const r = Math.round(Math.max(0, Math.min(1, toSRGB(r_lin))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, toSRGB(g_lin))) * 255);
  const b = Math.round(Math.max(0, Math.min(1, toSRGB(b_lin))) * 255);
  
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}

function oklabToRgb(oklabStr: string): string | null {
  const match = oklabStr.match(/oklab\(([^)]+)\)/);
  if (!match) return null;
  
  const parts = match[1].trim().split(/[\s,/]+/);
  if (parts.length < 3) return null;
  
  let L = parseFloat(parts[0]);
  if (parts[0].includes('%')) L /= 100;
  
  let oklab_a = parseFloat(parts[1]);
  if (parts[1].includes('%')) oklab_a /= 100;
  
  let oklab_b = parseFloat(parts[2]);
  if (parts[2].includes('%')) oklab_b /= 100;
  
  let a = 1;
  if (parts.length >= 4) {
    a = parseFloat(parts[3]);
    if (parts[3].includes('%')) a /= 100;
  }
  
  const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
  const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
  const s_ = L - 0.0894841775 * oklab_a - 1.2914855480 * oklab_b;
  
  const l_cubed = l_ * l_ * l_;
  const m_cubed = m_ * m_ * m_;
  const s_cubed = s_ * s_ * s_;
  
  const r_lin = +4.0767416621 * l_cubed - 3.3077115913 * m_cubed + 0.2309699292 * s_cubed;
  const g_lin = -1.2684380046 * l_cubed + 2.6097574011 * m_cubed - 0.3413193965 * s_cubed;
  const b_lin = -0.0041960863 * l_cubed - 0.7034186147 * m_cubed + 1.7076286104 * s_cubed;
  
  const toSRGB = (val: number) => {
    if (val <= 0.0031308) return val * 12.92;
    return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
  };
  
  const r = Math.round(Math.max(0, Math.min(1, toSRGB(r_lin))) * 255);
  const g = Math.round(Math.max(0, Math.min(1, toSRGB(g_lin))) * 255);
  const b = Math.round(Math.max(0, Math.min(1, toSRGB(b_lin))) * 255);
  
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}

function replaceOklchWithRgb(str: string): string {
  if (!str || typeof str !== 'string') return str;
  let temp = str.replace(/oklch\([^)]+\)/g, (match) => {
    try {
      const converted = oklchToRgb(match);
      return converted || match;
    } catch (e) {
      return match;
    }
  });
  return temp.replace(/oklab\([^)]+\)/g, (match) => {
    try {
      const converted = oklabToRgb(match);
      return converted || match;
    } catch (e) {
      return match;
    }
  });
}

export function generateMarkListSpreadsheet(allocation: any, studentEntries: any[], examName: string, approvedBy: string, sentAt: string) {
  const s: any = {};
  
  const setCell = (r: number, c: number, val: any, type: string = 's', bold: boolean = false, align: string = 'center', bg?: string, size?: number) => {
    const cellRef = XLSX.utils.encode_cell({ r, c });
    s[cellRef] = {
      t: type,
      v: val,
      s: {
        font: {
          bold,
          sz: size || 10,
          color: { rgb: '1e293b' }
        },
        alignment: {
          horizontal: align,
          vertical: 'center',
          wrapText: true
        },
        fill: bg ? { fgColor: { rgb: bg } } : undefined
      }
    };
  };

  // Setup Title banner
  setCell(0, 0, "NATIONAL HIGH SCHOOL, TALODA", 's', true, 'center', '1e293b', 14);
  setCell(1, 0, `OFFICIAL READ-ONLY SUBJECT MARK LIST - ${examName.toUpperCase()}`, 's', true, 'center', '334155', 11);
  setCell(2, 0, `Academic Year: 2026-27 | Class & Division: ${allocation.className} - ${allocation.divisionName}`, 's', false, 'center', '475569', 10);
  setCell(3, 0, `Subject: ${allocation.subjectName} | Approved By: ${approvedBy} | Date: ${new Date(sentAt).toLocaleDateString()}`, 's', false, 'center', '64748b', 9);

  // Set white color for text on title banners
  ['A1', 'A2', 'A3', 'A4'].forEach((cellRef, idx) => {
    const cell = s[cellRef];
    if (cell && cell.s && cell.s.font) {
      cell.s.font.color = { rgb: 'ffffff' };
    }
  });

  // Table Headers
  const headers = ["Roll No", "G.R. Number", "Student Name", "Total Marks", "Grade"];
  headers.forEach((h, cIdx) => {
    setCell(5, cIdx, h, 's', true, 'center', 'f1f5f9', 10);
  });

  // Student Entries
  studentEntries.forEach((entry, idx) => {
    const rIdx = 6 + idx;
    setCell(rIdx, 0, entry.rollNo || idx + 1, 'n', false, 'center');
    setCell(rIdx, 1, entry.grNumber || '-', 's', false, 'center');
    setCell(rIdx, 2, entry.studentName, 's', true, 'left');
    setCell(rIdx, 3, entry.subjectTotal !== undefined ? entry.subjectTotal : (entry.marks !== undefined ? entry.marks : '-'), 'n', true, 'center');
    setCell(rIdx, 4, entry.grade || '-', 's', true, 'center');
  });

  const lastRow = 6 + studentEntries.length;
  // Signatures Row
  setCell(lastRow + 2, 0, "Subject Teacher Signature", 's', true, 'center');
  setCell(lastRow + 2, 2, "Class Teacher Signature", 's', true, 'center');
  setCell(lastRow + 2, 4, "Headmaster Stamp & Sign", 's', true, 'center');

  // Define Merges for Title banner columns (spanning columns A to E, i.e., index 0 to 4)
  s['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
    // Also merge columns for signatures
    { s: { r: lastRow + 2, c: 0 }, e: { r: lastRow + 2, c: 1 } },
    { s: { r: lastRow + 2, c: 4 }, e: { r: lastRow + 2, c: 4 } },
  ];

  // Define Column Widths
  s['!cols'] = [
    { wpx: 80 },  // Roll No
    { wpx: 120 }, // G.R. Number
    { wpx: 280 }, // Name
    { wpx: 100 }, // Total Marks
    { wpx: 80 }   // Grade
  ];

  // Define Row Heights
  const rows: any[] = [];
  rows[0] = { hpx: 35 };
  rows[1] = { hpx: 28 };
  rows[2] = { hpx: 24 };
  rows[3] = { hpx: 24 };
  rows[5] = { hpx: 30 };
  for (let i = 0; i < studentEntries.length; i++) {
    rows[6 + i] = { hpx: 26 };
  }
  rows[lastRow + 2] = { hpx: 80 }; // signature spacing
  s['!rows'] = rows;

  // Set Range
  s['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow + 4, c: 4 } });

  return s;
}

export interface PrintablePage {
  sheet: any; // SheetJS worksheet object
  title?: string;
  subtitle?: string;
  studentName?: string;
  pageNumber?: number;
}

interface CommonPrintEngineProps {
  title: string;
  pages: PrintablePage[];
  user: User;
  lang: Language;
  onClose: () => void;
  paperSize?: 'legal' | 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  scale?: number; // scale percent e.g. 77 or 100
}

export default function CommonPrintEngine({
  title,
  pages,
  user,
  lang,
  onClose,
  paperSize = 'legal',
  orientation = 'portrait',
  scale = 100,
}: CommonPrintEngineProps) {
  const isUrdu = lang === 'ur';
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Dimensions based on page size and orientation
  const getPageDimensions = () => {
    const isLandscape = orientation === 'landscape';
    if (paperSize === 'legal') {
      return {
        width: isLandscape ? '14in' : '8.5in',
        height: isLandscape ? '8.5in' : '14in',
        pixelWidth: isLandscape ? 1344 : 816,
        pixelHeight: isLandscape ? 816 : 1344,
      };
    } else if (paperSize === 'letter') {
      return {
        width: isLandscape ? '11in' : '8.5in',
        height: isLandscape ? '8.5in' : '11in',
        pixelWidth: isLandscape ? 1056 : 816,
        pixelHeight: isLandscape ? 816 : 1056,
      };
    } else {
      // default A4
      return {
        width: isLandscape ? '11.7in' : '8.3in',
        height: isLandscape ? '8.3in' : '11.7in',
        pixelWidth: isLandscape ? 1123 : 796,
        pixelHeight: isLandscape ? 796 : 1123,
      };
    }
  };

  const dims = getPageDimensions();

  // Handle native window print
  const handleNativePrint = () => {
    openSmartPrint({
      title,
      elementId: 'common-print-engine-viewport',
      orientation,
      paperSize: paperSize === 'legal' ? 'Legal' : paperSize === 'letter' ? 'Letter' : 'A4',
      moduleName: 'Result Management'
    });
    LocalERPDatabase.addAuditLog(
      user.id,
      user.name,
      user.role,
      "OPEN_SMART_PRINT",
      "Result Management",
      `Opened Smart Print Setup for: ${title}`
    );
  };

  // Download high-resolution PDF with oklch translation proxy using html2pdf
  const handleDownloadPDF = async () => {
    openSmartPrint({
      title,
      elementId: 'common-print-engine-viewport',
      orientation,
      paperSize: paperSize === 'legal' ? 'Legal' : paperSize === 'letter' ? 'Letter' : 'A4',
      moduleName: 'Result Management'
    });
  };

  // Helper resolvers for spreadsheet attributes
  const getMergeInfo = (sheet: any, r: number, c: number) => {
    const merges = sheet['!merges'] || [];
    for (const merge of merges) {
      if (r >= merge.s.r && r <= merge.e.r && c >= merge.s.c && c <= merge.e.c) {
        const isTopLeft = (r === merge.s.r && c === merge.s.c);
        return {
          isMerged: true,
          isTopLeft,
          rowSpan: merge.e.r - merge.s.r + 1,
          colSpan: merge.e.c - merge.s.c + 1,
          range: merge
        };
      }
    }
    return { isMerged: false, isTopLeft: true, rowSpan: 1, colSpan: 1 };
  };

  const getColWidth = (sheet: any, c: number) => {
    const cols = sheet['!cols'];
    if (cols?.[c]) {
      if (cols[c].wpx) return `${cols[c].wpx}px`;
      if (cols[c].wch) return `${cols[c].wch * 8}px`;
      if (cols[c].width) return `${cols[c].width * 8}px`;
    }
    return '100px';
  };

  const getRowHeight = (sheet: any, r: number) => {
    const rows = sheet['!rows'];
    if (rows?.[r]) {
      if (rows[r].hpx) return `${rows[r].hpx}px`;
      if (rows[r].hpt) return `${rows[r].hpt * 1.33}px`;
    }
    return '28px';
  };

  const getCellStyle = (sheet: any, r: number, c: number, cell: any) => {
    const styles: React.CSSProperties = {
      width: getColWidth(sheet, c),
      height: getRowHeight(sheet, r),
    };

    if (cell?.s) {
      if (cell.s.font) {
        if (cell.s.font.bold) styles.fontWeight = 'bold';
        if (cell.s.font.italic) styles.fontStyle = 'italic';
        if (cell.s.font.sz) styles.fontSize = `${cell.s.font.sz}pt`;
        if (cell.s.font.color?.rgb) {
          styles.color = cell.s.font.color.rgb.startsWith('#') ? cell.s.font.color.rgb : `#${cell.s.font.color.rgb}`;
        }
      }
      if (cell.s.alignment?.horizontal) {
        styles.textAlign = cell.s.alignment.horizontal as any;
      }
      if (cell.s.fill?.fgColor?.rgb) {
        styles.backgroundColor = cell.s.fill.fgColor.rgb.startsWith('#') ? cell.s.fill.fgColor.rgb : `#${cell.s.fill.fgColor.rgb}`;
      }
    }

    return styles;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col z-50">
      
      {/* Styles Injected dynamically for Standard Browser Media Print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(#common-print-engine-viewport) {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
          }
          #common-print-engine-viewport {
            display: block !important;
            visibility: visible !important;
            width: ${dims.width} !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .common-print-page {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${dims.width} !important;
            height: ${dims.height} !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            background: white !important;
          }
          .print-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            background: white !important;
          }
          .print-table td, .print-table th {
            border: 1px solid #94a3b8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .scale-print-container {
            zoom: ${scale}% !important;
            transform-origin: top center !important;
          }
          @page {
            size: ${paperSize} ${orientation};
            margin: 0.4in;
          }
        }
      `}} />

      {/* Ribbon Control Toolbar - Hidden during printing */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shadow-sm print:hidden">
        <div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            {isUrdu ? "سرکاری پرنٹنگ رجسٹری" : "Official Preservation Printing Engine"}
          </h4>
          <p className="text-xs text-slate-500 font-bold">
            {title} ({pages.length} {pages.length === 1 ? 'Page' : 'Pages'} Ready for Legal/A4 Output)
          </p>
        </div>
        
        <div className="w-full sm:w-auto overflow-x-auto pb-1.5 scrollbar-visible mt-3 sm:mt-0">
          <div className="flex flex-nowrap items-center gap-3 min-w-max pb-1">
            <button
              onClick={handleNativePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>{isUrdu ? "پرنٹ کریں" : "Smart Print / PDF"}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPdf}
              className={`px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${isExportingPdf ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isExportingPdf ? (isUrdu ? "پی ڈی ایف تیار ہو رہا ہے..." : "Generating...") : (isUrdu ? "پی ڈی ایف ڈاؤن لوڈ کریں" : "PDF Setup")}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>{isUrdu ? "بند کریں" : "Close"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Snapshot Viewport Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100 print:p-0 print:bg-white flex justify-center">
        <div 
          id="common-print-engine-viewport"
          className="space-y-8 w-full flex flex-col items-center"
        >
          {pages.map((page, pIdx) => {
            const sheet = page.sheet;
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:K35');
            const minRow = range.s.r;
            const maxRow = range.e.r;
            const minCol = range.s.c;
            const maxCol = range.e.c;

            return (
              <div 
                key={pIdx}
                className="common-print-page bg-white border border-slate-300 rounded-sm shadow-2xl p-8 relative overflow-auto shrink-0 select-text"
                style={{ width: dims.width, minHeight: dims.height }}
              >
                {/* Scale Container */}
                <div className="scale-print-container w-full overflow-auto">
                  <table className="w-full border-collapse font-sans text-xs table-fixed print-table select-text">
                    <tbody>
                      {Array.from({ length: maxRow - minRow + 1 }).map((_, rIdx) => {
                        const rowIdx = minRow + rIdx;
                        const rHeight = getRowHeight(sheet, rowIdx);

                        return (
                          <tr
                            key={rowIdx}
                            style={{ height: rHeight }}
                            className="border-b border-slate-200"
                          >
                            {Array.from({ length: maxCol - minCol + 1 }).map((_, cIdx) => {
                              const colIdx = minCol + cIdx;
                              const { isMerged, isTopLeft, rowSpan, colSpan } = getMergeInfo(sheet, rowIdx, colIdx);

                              if (isMerged && !isTopLeft) return null;

                              const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                              const cell = sheet[cellRef];

                              let displayVal = '';
                              if (cell) {
                                if (cell.f) {
                                  displayVal = cell.v !== undefined ? String(cell.v) : `=${cell.f}`;
                                } else {
                                  displayVal = cell.v !== undefined ? String(cell.v) : '';
                                }
                              }

                              const finalStyle = getCellStyle(sheet, rowIdx, colIdx, cell);

                              return (
                                <td
                                  key={colIdx}
                                  rowSpan={isMerged ? rowSpan : undefined}
                                  colSpan={isMerged ? colSpan : undefined}
                                  style={finalStyle}
                                  className="border-r border-b border-slate-200 px-2 py-1 text-xs truncate relative select-text"
                                >
                                  {displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
