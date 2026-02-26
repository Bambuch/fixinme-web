import { useState, useEffect } from 'react';
import type { Quantity, Unit, Readout } from '../types';
import { useAuth, useFlash } from '../App';
import {
  getUserQuantities,
  getUserUnits,
  getUserReadouts,
  createReadout,
  deleteReadout,
  sortQuantities,
  sortUnits,
} from '../store';
import { Plus, Trash2, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react';

type GroupedReadouts = Record<string, Readout[]>;

export default function MeasurementsPage() {
  const { user } = useAuth();
  const { addFlash } = useFlash();
  const [quantities, setQuantities] = useState<Quantity[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [readouts, setReadouts] = useState<Readout[]>([]);
  const [selectedQuantityId, setSelectedQuantityId] = useState<string>('');
  const [value, setValue] = useState('');
  const [unitId, setUnitId] = useState<string>('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const refresh = () => {
    if (!user) return;
    const qs = sortQuantities(getUserQuantities(user.id));
    const us = sortUnits(getUserUnits(user.id));
    const rs = getUserReadouts(user.id).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setQuantities(qs);
    setUnits(us);
    setReadouts(rs);
    if (!selectedQuantityId && qs.length > 0) {
      setSelectedQuantityId(qs[0].id);
    }
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedQuantityId || !value) return;

    const num = parseFloat(value);
    if (isNaN(num)) {
      addFlash('alert', 'Wartość musi być liczbą.');
      return;
    }

    createReadout(user.id, {
      quantityId: selectedQuantityId,
      value: num,
      unitId: unitId || null,
    });

    const q = quantities.find((x) => x.id === selectedQuantityId);
    addFlash('notice', `Pomiar dla "${q?.name}" został zapisany.`);
    setValue('');
    refresh();

    // Auto-expand this quantity group
    setExpandedGroups((prev) => new Set([...prev, selectedQuantityId]));
  };

  const handleDelete = (r: Readout) => {
    const q = quantities.find((x) => x.id === r.quantityId);
    if (!confirm(`Usunąć ten pomiar (${r.value}) dla "${q?.name}"?`)) return;
    deleteReadout(r.id);
    addFlash('notice', 'Pomiar został usunięty.');
    refresh();
  };

  const toggleGroup = (qId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  // Group readouts by quantity
  const grouped: GroupedReadouts = {};
  readouts.forEach((r) => {
    if (!grouped[r.quantityId]) grouped[r.quantityId] = [];
    grouped[r.quantityId].push(r);
  });

  const quantitiesWithReadouts = quantities.filter((q) => grouped[q.id]?.length > 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-layout measurements-layout">
      {/* Add measurement form */}
      <div className="measurements-form-panel">
        <h3 className="panel-title">Nowy pomiar</h3>
        <form onSubmit={handleSubmit} className="measurement-form">
          {quantities.length === 0 ? (
            <p className="hint-text">
              Najpierw dodaj wielkości na zakładce "Wielkości".
            </p>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="quantity-select">Wielkość</label>
                <select
                  id="quantity-select"
                  value={selectedQuantityId}
                  onChange={(e) => setSelectedQuantityId(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">— wybierz —</option>
                  {quantities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {'  '.repeat(q.depth)}
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="value-input">Wartość</label>
                <input
                  id="value-input"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  step="any"
                  required
                  placeholder="np. 75.5"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="unit-select">Jednostka (opcjonalna)</label>
                <select
                  id="unit-select"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="form-select"
                >
                  <option value="">— brak —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.symbol}
                      {u.description ? ` — ${u.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                <Plus size={16} />
                Zapisz pomiar
              </button>
            </>
          )}
        </form>
      </div>

      {/* Readouts list */}
      <div className="page-content">
        {readouts.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} className="empty-icon" />
            <p>Brak pomiarów. Dodaj pierwszy używając formularza po lewej.</p>
          </div>
        ) : (
          <div className="readouts-list">
            {quantitiesWithReadouts.length === 0 && (
              <p className="hint-text">Brak pomiarów dla bieżących wielkości.</p>
            )}
            {quantitiesWithReadouts.map((q) => {
              const qReadouts = grouped[q.id] || [];
              const isExpanded = expandedGroups.has(q.id);
              const latest = qReadouts[0];
              const latestUnit = latest?.unitId ? units.find((u) => u.id === latest.unitId) : null;

              return (
                <div key={q.id} className="readout-group">
                  <button
                    className="readout-group-header"
                    onClick={() => toggleGroup(q.id)}
                  >
                    <span className="group-chevron">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                    <span
                      className="group-name"
                      style={{ marginLeft: `${q.depth * 1}rem` }}
                    >
                      {q.name}
                    </span>
                    <span className="group-meta">
                      {qReadouts.length} pomiar{qReadouts.length !== 1 ? 'ów' : ''}
                    </span>
                    {latest && (
                      <span className="group-latest">
                        ostatni:{' '}
                        <strong>
                          {latest.value}
                          {latestUnit ? ` ${latestUnit.symbol}` : ''}
                        </strong>
                        <span className="group-date">{formatDate(latest.createdAt)}</span>
                      </span>
                    )}
                  </button>

                  {isExpanded && (
                    <table className="items-table readouts-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Wartość</th>
                          <th>Jednostka</th>
                          <th>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qReadouts.map((r) => {
                          const unit = r.unitId ? units.find((u) => u.id === r.unitId) : null;
                          return (
                            <tr key={r.id} className="table-row">
                              <td className="date-cell">{formatDate(r.createdAt)}</td>
                              <td className="number-cell value-cell">{r.value}</td>
                              <td className="desc-cell">{unit?.symbol ?? '—'}</td>
                              <td className="actions-cell">
                                <button
                                  className="btn btn-icon btn-sm btn-danger"
                                  onClick={() => handleDelete(r)}
                                  title="Usuń"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
