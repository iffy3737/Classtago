import { useEffect, useState } from 'react';
import type { AssignmentSubmission } from '../types/domain';
import { listAssignmentSubmissions, reviewAssignmentSubmission } from '../services/teacherAcademicService';

export function SubmissionReviewPanel({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const [rows, setRows] = useState<AssignmentSubmission[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try { setRows(await listAssignmentSubmissions(recordId)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load submissions.'); }
  };
  useEffect(() => { void load(); }, [recordId]);

  const patch = (id: string, changes: Partial<AssignmentSubmission>) => setRows(rows.map((r) => r.id === id ? { ...r, ...changes } : r));

  return <div className="card">
    <div className="card-title-row"><div><h3>Student Submission Status</h3><small>Pending / submitted / checked review</small></div><button className="btn ghost" onClick={onClose}>Close</button></div>
    {error && <div className="alert warning">{error}</div>}
    {!rows.length ? <div className="empty">No student submission rows are available yet. Student-side roster/submission integration can populate this table.</div> : <div className="table-wrap"><table><thead><tr><th>Student</th><th>Status</th><th>Marks</th><th>Grade</th><th>Remarks</th><th></th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.studentName}</td><td><select value={r.status} onChange={(e) => patch(r.id, { status: e.target.value as AssignmentSubmission['status'] })}><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="checked">Checked</option></select></td><td><input className="table-input" type="number" value={r.marks ?? ''} onChange={(e) => patch(r.id, { marks: e.target.value === '' ? undefined : Number(e.target.value) })} /></td><td><input className="table-input" value={r.grade ?? ''} onChange={(e) => patch(r.id, { grade: e.target.value })} /></td><td><input className="table-input wide" value={r.remarks ?? ''} onChange={(e) => patch(r.id, { remarks: e.target.value })} /></td><td><button className="link-btn" onClick={async () => { await reviewAssignmentSubmission(r.id, { remarks: r.remarks, marks: r.marks, grade: r.grade, checked: r.status === 'checked' }); await load(); }}>Save Review</button></td></tr>)}</tbody></table></div>}
  </div>;
}
