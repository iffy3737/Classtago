import { useState } from 'react';
import type { PrintSettings } from '../types/domain';
import { openSmartPrint, loadSmartPrintPreferences, saveSmartPrintPreferences } from '../../../lib/smartPrint';

const defaults: PrintSettings = {
  paper: 'A4',
  orientation: 'portrait',
  marginMm: 12,
  scalePercent: 100,
  showSchoolHeader: true,
  showPageNumbers: true,
};

export function SmartPrintDialog({ disabled = false, targetId, title = 'Teacher Academic Document', defaultPaper = 'A4', defaultOrientation = 'portrait', moduleName, buttonLabel = 'Smart Print / PDF' }: { disabled?: boolean; targetId?: string; title?: string; defaultPaper?: PrintSettings['paper']; defaultOrientation?: PrintSettings['orientation']; moduleName?: string; buttonLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<PrintSettings>(() => ({ ...defaults, paper: defaultPaper, orientation: defaultOrientation, marginMm: moduleName === 'year-plan' ? 5 : moduleName === 'question-paper' ? 10 : defaults.marginMm, showSchoolHeader: moduleName === 'year-plan' ? false : defaults.showSchoolHeader, showPageNumbers: moduleName === 'year-plan' || moduleName === 'question-paper' ? false : defaults.showPageNumbers }));

  const print = () => {
    const current = loadSmartPrintPreferences();
    saveSmartPrintPreferences({
      ...current,
      paperSize: settings.paper,
      orientation: settings.orientation,
      marginMm: settings.marginMm,
      scaleMode: 'custom',
      scalePercent: settings.scalePercent,
      customWidthMm: settings.customWidthMm ?? current.customWidthMm,
      customHeightMm: settings.customHeightMm ?? current.customHeightMm,
      includeSchoolHeader: settings.showSchoolHeader,
      includePageNumbers: settings.showPageNumbers,
      ...(moduleName === 'question-paper' ? { questionPaperOptions: { showSchoolHeader: settings.showSchoolHeader } } : {})
    });
    setOpen(false);
    openSmartPrint({ elementId: targetId, title, paperSize: settings.paper, orientation: settings.orientation, moduleName });
  };

  return (
    <>
      <button className="btn secondary screen-only" disabled={disabled} onClick={() => setOpen(true)}>{buttonLabel}</button>
      {open && (
        <div className="modal screen-only" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head"><h3>Classtago Smart Print</h3><button className="icon-btn" onClick={() => setOpen(false)}>×</button></div>
            <div className="form-grid two">
              <label className="field"><span>Paper</span><select value={settings.paper} onChange={(e) => setSettings({ ...settings, paper: e.target.value as PrintSettings['paper'] })}>{['A3','A4','A5','Letter','Legal','Folio','Custom'].map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="field"><span>Orientation</span><select value={settings.orientation} onChange={(e) => setSettings({ ...settings, orientation: e.target.value as PrintSettings['orientation'] })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
              <label className="field"><span>Margins (mm)</span><input type="number" min={0} max={40} value={settings.marginMm} onChange={(e) => setSettings({ ...settings, marginMm: Number(e.target.value) })} /></label>
              <label className="field"><span>Scale %</span><input type="number" min={50} max={140} value={settings.scalePercent} onChange={(e) => setSettings({ ...settings, scalePercent: Number(e.target.value) })} /></label>
            </div>
            {settings.paper === 'Custom' && <div className="form-grid two"><label className="field"><span>Width mm</span><input type="number" value={settings.customWidthMm ?? 210} onChange={(e) => setSettings({ ...settings, customWidthMm: Number(e.target.value) })} /></label><label className="field"><span>Height mm</span><input type="number" value={settings.customHeightMm ?? 297} onChange={(e) => setSettings({ ...settings, customHeightMm: Number(e.target.value) })} /></label></div>}
            <div className="checks"><label><input type="checkbox" checked={settings.showSchoolHeader} onChange={(e) => setSettings({ ...settings, showSchoolHeader: e.target.checked })}/> School header</label><label><input type="checkbox" checked={settings.showPageNumbers} onChange={(e) => setSettings({ ...settings, showPageNumbers: e.target.checked })}/> Page numbers</label></div>
            <div className="actions"><button className="btn ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn primary" onClick={print}>Open Print / Save PDF</button></div>
          </div>
        </div>
      )}
    </>
  );
}
