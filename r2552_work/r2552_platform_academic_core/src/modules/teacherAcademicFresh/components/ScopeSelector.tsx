import type { TeacherAssignment } from '../types/domain';
import { divisionScreenLabel } from '../../../lib/divisionPresentation';

type Props = {
  assignments: TeacherAssignment[];
  value: string;
  onChange: (assignmentId: string) => void;
  disabled?: boolean;
};

export function ScopeSelector({ assignments, value, onChange, disabled }: Props) {
  return (
    <label className="field">
      <span>Assigned Class / Division / Subject</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        <option value="">Select assigned scope</option>
        {assignments.map((a) => (
          <option key={a.id} value={a.id}>
            {a.className}-{divisionScreenLabel(a.division)} • {a.subjectName} • {a.medium}
          </option>
        ))}
      </select>
    </label>
  );
}
