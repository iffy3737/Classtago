import type { StudyMaterial } from '../types/domain';

type Props = {
  materials: StudyMaterial[];
  selected: string[];
  onChange: (ids: string[]) => void;
};

export function MaterialPicker({ materials, selected, onChange }: Props) {
  if (!materials.length) {
    return <div className="empty">No Study Material is ready for this assigned scope. Upload/index material first.</div>;
  }
  return (
    <div className="material-picker">
      {materials.map((m) => {
        const checked = selected.includes(m.id);
        const ready = m.extractionStatus === 'ready';
        return (
          <label className={`material-option ${!ready ? 'disabled' : ''}`} key={m.id}>
            <input
              type="checkbox"
              checked={checked}
              disabled={!ready}
              onChange={() => onChange(checked ? selected.filter((id) => id !== m.id) : [...selected, m.id])}
            />
            <span>
              <strong>{m.title}</strong>
              <small>{m.chapter || 'No chapter tag'} • {m.kind} • {ready ? 'AI Ready' : m.extractionStatus}</small>
            </span>
          </label>
        );
      })}
    </div>
  );
}
