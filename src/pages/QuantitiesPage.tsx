import { useState, useEffect } from 'react';
import type { Quantity } from '../types';
import { useAuth, useFlash } from '../App';
import {
  getUserQuantities,
  createQuantity,
  updateQuantity,
  deleteQuantity,
  sortQuantities,
  reparentQuantity,
} from '../store';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  FolderOpen,
  Check,
  X,
} from 'lucide-react';

type FormMode = { type: 'none' } | { type: 'create'; parentId: string | null } | { type: 'edit'; quantity: Quantity };

export default function QuantitiesPage() {
  const { user } = useAuth();
  const { addFlash } = useFlash();
  const [quantities, setQuantities] = useState<Quantity[]>([]);
  const [formMode, setFormMode] = useState<FormMode>({ type: 'none' });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const refresh = () => {
    if (!user) return;
    setQuantities(sortQuantities(getUserQuantities(user.id)));
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const openCreate = (pId: string | null = null) => {
    setFormMode({ type: 'create', parentId: pId });
    setName('');
    setDescription('');
    setParentId(pId);
  };

  const openEdit = (q: Quantity) => {
    setFormMode({ type: 'edit', quantity: q });
    setName(q.name);
    setDescription(q.description);
    setParentId(q.parentId);
  };

  const cancel = () => {
    setFormMode({ type: 'none' });
    setName('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    if (formMode.type === 'create') {
      createQuantity(user.id, { name: name.trim(), description, parentId });
      addFlash('notice', `Wielkość "${name.trim()}" została dodana.`);
    } else if (formMode.type === 'edit') {
      updateQuantity(formMode.quantity.id, { name: name.trim(), description });
      addFlash('notice', `Wielkość "${name.trim()}" została zaktualizowana.`);
    }

    cancel();
    refresh();
  };

  const handleDelete = (q: Quantity) => {
    const children = quantities.filter((x) => x.parentId === q.id);
    if (children.length > 0) {
      addFlash('alert', `Nie można usunąć "${q.name}" — ma podkategorie.`);
      return;
    }
    if (!confirm(`Usunąć wielkość "${q.name}"? Usunie też wszystkie jej pomiary.`)) return;
    const ok = deleteQuantity(q.id);
    if (ok) {
      addFlash('notice', `Wielkość "${q.name}" została usunięta.`);
      refresh();
    } else {
      addFlash('alert', 'Nie udało się usunąć wielkości.');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetParentId: string | null) => {
    e.preventDefault();
    if (!draggedId || !user) return;
    const dragged = quantities.find((q) => q.id === draggedId);
    if (!dragged) return;
    if (dragged.id === targetParentId) return;

    // Prevent dropping into own descendant
    const isDescendant = (candidateId: string | null): boolean => {
      if (!candidateId) return false;
      if (candidateId === dragged.id) return true;
      const candidate = quantities.find((q) => q.id === candidateId);
      return isDescendant(candidate?.parentId ?? null);
    };
    if (isDescendant(targetParentId)) {
      addFlash('alert', 'Nie można przenieść do własnego potomka.');
      return;
    }

    reparentQuantity(dragged.id, targetParentId);
    addFlash('notice', `"${dragged.name}" przeniesiono.`);
    refresh();
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const isEditing = formMode.type !== 'none';

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="inline-form">
      <div className="inline-form-fields">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nazwa"
          required
          maxLength={31}
          autoFocus
          className="form-input"
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
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
            className="form-select"
          >
            <option value="">— brak (top level) —</option>
            {quantities.map((q) => (
              <option key={q.id} value={q.id}>
                {'  '.repeat(q.depth)}
                {q.name}
              </option>
            ))}
          </select>
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

  return (
    <div className="page-layout">
      {/* Sidebar actions */}
      <div className="page-sidebar">
        {!isEditing && (
          <button className="btn btn-primary" onClick={() => openCreate(null)}>
            <Plus size={16} />
            Nowa wielkość
          </button>
        )}
        {isEditing && formMode.type === 'create' && (
          <div className="sidebar-form-panel">{renderForm()}</div>
        )}
      </div>

      {/* Main content */}
      <div className="page-content">
        {/* Edit form appears above table */}
        {formMode.type === 'edit' && (
          <div className="edit-panel">{renderForm()}</div>
        )}

        {quantities.length === 0 ? (
          <div className="empty-state">
            <FolderOpen size={48} className="empty-icon" />
            <p>Brak wielkości. Dodaj pierwszą klikając "Nowa wielkość".</p>
          </div>
        ) : (
          <>
            {/* Top-level drop zone */}
            <div
              className="drop-zone-top"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, null)}
            >
              Upuść tutaj, aby przenieść na poziom główny
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Opis</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {quantities.map((q) => (
                  <tr
                    key={q.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, q.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, q.id)}
                    className={`table-row ${draggedId === q.id ? 'dragging' : ''}`}
                  >
                    <td className="name-cell" style={{ paddingLeft: `${1 + q.depth * 1.5}rem` }}>
                      {q.depth > 0 && (
                        <ChevronRight size={14} className="depth-arrow" />
                      )}
                      <span className="item-name">{q.name}</span>
                    </td>
                    <td className="desc-cell">{q.description}</td>
                    <td className="actions-cell">
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={() => openCreate(q.id)}
                        title="Dodaj podkategorię"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="btn btn-icon btn-sm"
                        onClick={() => openEdit(q)}
                        title="Edytuj"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-icon btn-sm btn-danger"
                        onClick={() => handleDelete(q)}
                        title="Usuń"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
