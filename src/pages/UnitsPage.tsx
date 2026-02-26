import { useState, useEffect } from 'react';
import type { Unit } from '../types';
import { useAuth, useFlash } from '../App';
import {
  getUserUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  sortUnits,
} from '../store';
import { Plus, Pencil, Trash2, Check, X, Ruler } from 'lucide-react';

type FormMode = { type: 'none' } | { type: 'create' } | { type: 'edit'; unit: Unit };

export default function UnitsPage() {
  const { user } = useAuth();
  const { addFlash } = useFlash();
  const [units, setUnits] = useState<Unit[]>([]);
  const [formMode, setFormMode] = useState<FormMode>({ type: 'none' });
  const [symbol, setSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [multiplier, setMultiplier] = useState('1');
  const [baseId, setBaseId] = useState<string>('');

  const refresh = () => {
    if (!user) return;
    setUnits(sortUnits(getUserUnits(user.id)));
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const openCreate = () => {
    setFormMode({ type: 'create' });
    setSymbol('');
    setDescription('');
    setMultiplier('1');
    setBaseId('');
  };

  const openEdit = (u: Unit) => {
    setFormMode({ type: 'edit', unit: u });
    setSymbol(u.symbol);
    setDescription(u.description);
    setMultiplier(String(u.multiplier));
    setBaseId(u.baseId ?? '');
  };

  const cancel = () => {
    setFormMode({ type: 'none' });
    setSymbol('');
    setDescription('');
    setMultiplier('1');
    setBaseId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !symbol.trim()) return;

    const mult = parseFloat(multiplier);
    if (isNaN(mult) || mult <= 0) {
      addFlash('alert', 'Mnożnik musi być liczbą dodatnią.');
      return;
    }

    // Only user's own units can be base (no default units as base for now)
    const selectedBaseId = baseId || null;

    if (formMode.type === 'create') {
      // Check uniqueness
      if (units.some((u) => u.symbol === symbol.trim() && u.userId === user.id)) {
        addFlash('alert', `Symbol "${symbol.trim()}" jest już używany.`);
        return;
      }
      createUnit(user.id, {
        symbol: symbol.trim(),
        description,
        multiplier: selectedBaseId ? mult : 1,
        baseId: selectedBaseId,
      });
      addFlash('notice', `Jednostka "${symbol.trim()}" została dodana.`);
    } else if (formMode.type === 'edit') {
      if (formMode.unit.userId === null) {
        addFlash('alert', 'Nie można edytować jednostek domyślnych.');
        return;
      }
      updateUnit(formMode.unit.id, {
        symbol: symbol.trim(),
        description,
        multiplier: mult,
      });
      addFlash('notice', `Jednostka "${symbol.trim()}" została zaktualizowana.`);
    }

    cancel();
    refresh();
  };

  const handleDelete = (u: Unit) => {
    if (u.userId === null) {
      addFlash('alert', 'Nie można usunąć jednostek domyślnych.');
      return;
    }
    const hasSubunits = units.some((x) => x.baseId === u.id);
    if (hasSubunits) {
      addFlash('alert', `Nie można usunąć "${u.symbol}" — ma powiązane podjednostki.`);
      return;
    }
    if (!confirm(`Usunąć jednostkę "${u.symbol}"?`)) return;
    const ok = deleteUnit(u.id);
    if (ok) {
      addFlash('notice', `Jednostka "${u.symbol}" została usunięta.`);
      refresh();
    } else {
      addFlash('alert', 'Nie udało się usunąć jednostki.');
    }
  };

  const baseUnits = units.filter((u) => !u.baseId && u.userId === user?.id);

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="inline-form-fields">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol (np. kg)"
          required
          maxLength={15}
          autoFocus
          className="form-input form-input-sm"
          disabled={formMode.type === 'edit' && (formMode as { type: 'edit'; unit: Unit }).unit.userId === null}
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opis (opcjonalny)"
          className="form-input"
        />
        {formMode.type === 'create' && (
          <select
            value={baseId}
            onChange={(e) => setBaseId(e.target.value)}
            className="form-select"
          >
            <option value="">— jednostka bazowa (brak) —</option>
            {baseUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.symbol}
                {u.description ? ` — ${u.description}` : ''}
              </option>
            ))}
          </select>
        )}
        {(baseId || formMode.type === 'edit') && (
          <div className="multiplier-group">
            <input
              type="number"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              placeholder="Mnożnik"
              step="any"
              min="0"
              className="form-input form-input-sm"
              disabled={!baseId && formMode.type === 'create'}
            />
            <span className="multiplier-label">
              {baseId ? `× (baza: ${units.find((u) => u.id === baseId)?.symbol})` : '× (mnożnik = 1 dla jednostek bazowych)'}
            </span>
          </div>
        )}
      </div>
      <div className="inline-form-actions">
        <button type="submit" className="btn btn-primary btn-sm">
          <Check size={14} />
          Zapisz
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>
          <X size={14} />
          Anuluj
        </button>
      </div>
    </form>
  );

  const defaultUnits = units.filter((u) => u.userId === null);
  const userUnits = units.filter((u) => u.userId === user?.id);

  return (
    <div className="page-layout">
      {/* Sidebar */}
      <div className="page-sidebar">
        {formMode.type === 'none' && (
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Nowa jednostka
          </button>
        )}
        {formMode.type === 'create' && (
          <div className="sidebar-form-panel">{renderForm()}</div>
        )}
      </div>

      {/* Main content */}
      <div className="page-content">
        {formMode.type === 'edit' && (
          <div className="edit-panel">{renderForm()}</div>
        )}

        {units.length === 0 ? (
          <div className="empty-state">
            <Ruler size={48} className="empty-icon" />
            <p>Brak jednostek.</p>
          </div>
        ) : (
          <>
            {/* User units */}
            {userUnits.length > 0 && (
              <>
                <h3 className="section-title">Moje jednostki</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Opis</th>
                      <th>Mnożnik</th>
                      <th>Baza</th>
                      <th>Akcje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userUnits.map((u) => {
                      const base = u.baseId ? units.find((x) => x.id === u.baseId) : null;
                      return (
                        <tr key={u.id} className="table-row">
                          <td className="name-cell symbol-cell">{u.symbol}</td>
                          <td className="desc-cell">{u.description}</td>
                          <td className="number-cell">{base ? u.multiplier : '—'}</td>
                          <td className="desc-cell">{base?.symbol ?? '—'}</td>
                          <td className="actions-cell">
                            <button
                              className="btn btn-icon btn-sm"
                              onClick={() => openEdit(u)}
                              title="Edytuj"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-icon btn-sm btn-danger"
                              onClick={() => handleDelete(u)}
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
              </>
            )}

            {/* Default units */}
            {defaultUnits.length > 0 && (
              <>
                <h3 className="section-title">Jednostki domyślne</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Opis</th>
                      <th>Mnożnik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {defaultUnits.map((u) => (
                      <tr key={u.id} className="table-row table-row-muted">
                        <td className="name-cell symbol-cell">{u.symbol}</td>
                        <td className="desc-cell">{u.description}</td>
                        <td className="number-cell">{u.multiplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
