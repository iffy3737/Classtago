import { useEffect, useState } from 'react';
import { Pencil, RotateCw, Trash2 } from 'lucide-react';
import type { AcademicRecordListItem, SavedAcademicRecord } from '../types/domain';
import { deleteHomeworkAcademicRecord, listAcademicRecords, resendHomeworkAcademicRecord } from '../services/teacherAcademicService';

type Props = {
  kind: SavedAcademicRecord['kind'];
  title: string;
  refreshKey: number;
  onSelect?: (record: AcademicRecordListItem) => void;
  onEdit?: (record: AcademicRecordListItem) => void;
  onResend?: (record: AcademicRecordListItem) => void;
  onChanged?: () => void;
};

export function AcademicHistory({ kind, title, refreshKey, onSelect, onEdit, onResend, onChanged }: Props) {
  const [rows, setRows] = useState<AcademicRecordListItem[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    try { setError(''); setRows(await listAcademicRecords(kind)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load history.'); }
  };

  useEffect(() => { let active=true; listAcademicRecords(kind).then(data=>{if(active){setRows(data);setError('');}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load history.');}); return()=>{active=false;}; }, [kind, refreshKey]);

  const removeHomework = async (record: AcademicRecordListItem) => {
    if (!window.confirm(`Delete “${record.title}”?\n\nThis removes the Homework record and its attached files. Already-sent Communication history is kept for audit.`)) return;
    setBusyId(record.id); setError(''); setMessage('');
    try {
      const result = await deleteHomeworkAcademicRecord(record.id);
      setRows(current => current.filter(row => row.id !== record.id));
      setMessage(result.warning || 'Homework deleted.');
      onChanged?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Homework could not be deleted.'); }
    finally { setBusyId(''); }
  };

  const resendHomework = async (record: AcademicRecordListItem) => {
    setBusyId(record.id); setError(''); setMessage('');
    try {
      await resendHomeworkAcademicRecord(record.id);
      setRows(current => current.map(row => row.id === record.id ? { ...row, status: 'published' as const, updatedAt: new Date().toISOString() } : row));
      setMessage('Homework is ready to send again. Choose the delivery channel on Homework Notifications.');
      onResend?.(record);
      onChanged?.();
    } catch (e) { setError(e instanceof Error ? e.message : 'Homework could not be prepared for resend.'); }
    finally { setBusyId(''); }
  };

  return <div className="card">
    <div className="card-title-row"><h3>{title}</h3><small>{rows.length} recent record(s)</small></div>
    {error && <div className="alert warning">{error}</div>}
    {message && <div className="alert success">{message}</div>}
    {!rows.length ? <div className="empty">No previous records yet.</div> : <div className="table-wrap"><table><thead><tr><th>Title</th><th>Class</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><strong>{r.title}</strong></td><td>{r.className ?? '—'}{r.division ? `-${r.division}` : ''}<small className="block">{r.subjectName ?? ''}</small></td><td><span className="status ready">{r.status}</span></td><td>{new Date(r.updatedAt).toLocaleDateString()}</td><td>{kind==='homework' ? <div className="flex min-w-[245px] flex-wrap gap-2">
      <button type="button" className="link-btn inline-flex items-center gap-1" disabled={busyId===r.id} onClick={()=>onEdit?.(r)}><Pencil className="h-3.5 w-3.5"/>Edit</button>
      <button type="button" className="link-btn inline-flex items-center gap-1" disabled={busyId===r.id} onClick={()=>void resendHomework(r)}>{busyId===r.id?<RotateCw className="h-3.5 w-3.5 animate-spin"/>:<RotateCw className="h-3.5 w-3.5"/>}Resend</button>
      <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:opacity-40" disabled={busyId===r.id} onClick={()=>void removeHomework(r)}><Trash2 className="h-3.5 w-3.5"/>Delete</button>
    </div> : onSelect && <button className="link-btn" onClick={() => onSelect(r)}>Open Submissions</button>}</td></tr>)}</tbody></table></div>}
  </div>;
}
