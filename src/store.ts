import { v4 as uuidv4 } from 'uuid';
import type { User, Quantity, Unit, Readout } from './types';

// Storage keys
const KEYS = {
  users: 'fixinme-users',
  currentUserId: 'fixinme-current-user',
  quantities: 'fixinme-quantities',
  units: 'fixinme-units',
  readouts: 'fixinme-readouts',
};

function load<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ============================================================
// Default units (seeded once)
// ============================================================
const DEFAULT_UNITS: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { userId: null, symbol: 'kg', description: 'kilogram', multiplier: 1, baseId: null },
  { userId: null, symbol: 'g', description: 'gram', multiplier: 0.001, baseId: null },
  { userId: null, symbol: 'lb', description: 'pound', multiplier: 0.453592, baseId: null },
  { userId: null, symbol: 'cm', description: 'centimeter', multiplier: 1, baseId: null },
  { userId: null, symbol: 'mm', description: 'millimeter', multiplier: 0.1, baseId: null },
  { userId: null, symbol: 'm', description: 'meter', multiplier: 100, baseId: null },
  { userId: null, symbol: 'bpm', description: 'beats per minute', multiplier: 1, baseId: null },
  { userId: null, symbol: 'mmHg', description: 'millimeters of mercury', multiplier: 1, baseId: null },
  { userId: null, symbol: '%', description: 'percent', multiplier: 1, baseId: null },
  { userId: null, symbol: 'kcal', description: 'kilocalorie', multiplier: 1, baseId: null },
  { userId: null, symbol: 'ml', description: 'milliliter', multiplier: 1, baseId: null },
  { userId: null, symbol: 'l', description: 'liter', multiplier: 1000, baseId: null },
  { userId: null, symbol: 'h', description: 'hour', multiplier: 1, baseId: null },
  { userId: null, symbol: 'min', description: 'minute', multiplier: 1 / 60, baseId: null },
  { userId: null, symbol: 'steps', description: 'steps', multiplier: 1, baseId: null },
];

export function ensureDefaultUnits() {
  const units = loadUnits();
  const hasDefaults = units.some((u) => u.userId === null);
  if (!hasDefaults) {
    const now = new Date().toISOString();
    const defaultUnits: Unit[] = DEFAULT_UNITS.map((u) => ({
      ...u,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }));
    // Fix up baseIds by symbol reference
    save(KEYS.units, defaultUnits);
  }
}

// ============================================================
// Users
// ============================================================
export function loadUsers(): User[] {
  return load<User>(KEYS.users);
}

export function saveUsers(users: User[]) {
  save(KEYS.users, users);
}

export function getCurrentUserId(): string | null {
  return localStorage.getItem(KEYS.currentUserId);
}

export function setCurrentUserId(id: string | null) {
  if (id) {
    localStorage.setItem(KEYS.currentUserId, id);
  } else {
    localStorage.removeItem(KEYS.currentUserId);
  }
}

export function getCurrentUser(): User | null {
  const id = getCurrentUserId();
  if (!id) return null;
  return loadUsers().find((u) => u.id === id) ?? null;
}

export function registerUser(email: string, password: string): User | null {
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return null; // email taken
  }
  const user: User = {
    id: uuidv4(),
    email,
    password,
    status: users.length === 0 ? 'admin' : 'active',
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  return user;
}

export function loginUser(email: string, password: string): User | null {
  const user = loadUsers().find(
    (u) =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password &&
      u.status !== 'disabled' &&
      u.status !== 'locked'
  );
  return user ?? null;
}

// ============================================================
// Quantities
// ============================================================
export function loadQuantities(): Quantity[] {
  return load<Quantity>(KEYS.quantities);
}

export function saveQuantities(quantities: Quantity[]) {
  save(KEYS.quantities, quantities);
}

export function getUserQuantities(userId: string): Quantity[] {
  return loadQuantities().filter((q) => q.userId === userId);
}

function computeDepth(parentId: string | null, quantities: Quantity[]): number {
  if (!parentId) return 0;
  const parent = quantities.find((q) => q.id === parentId);
  if (!parent) return 0;
  return parent.depth + 1;
}

export function createQuantity(
  userId: string,
  data: { name: string; description: string; parentId: string | null }
): Quantity {
  const quantities = loadQuantities();
  const now = new Date().toISOString();
  const quantity: Quantity = {
    id: uuidv4(),
    userId,
    name: data.name,
    description: data.description,
    parentId: data.parentId,
    depth: computeDepth(data.parentId, quantities),
    createdAt: now,
    updatedAt: now,
  };
  saveQuantities([...quantities, quantity]);
  return quantity;
}

export function updateQuantity(
  id: string,
  data: Partial<{ name: string; description: string }>
): Quantity | null {
  const quantities = loadQuantities();
  const idx = quantities.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  const updated = { ...quantities[idx], ...data, updatedAt: new Date().toISOString() };
  quantities[idx] = updated;
  saveQuantities(quantities);
  return updated;
}

export function reparentQuantity(id: string, parentId: string | null): Quantity | null {
  const quantities = loadQuantities();
  const idx = quantities.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  const newDepth = computeDepth(parentId, quantities);
  const updated = {
    ...quantities[idx],
    parentId,
    depth: newDepth,
    updatedAt: new Date().toISOString(),
  };
  quantities[idx] = updated;
  // Update depths of descendants
  const updateDescendants = (parentId: string, depth: number) => {
    quantities.forEach((q, i) => {
      if (q.parentId === parentId) {
        quantities[i] = { ...q, depth: depth + 1 };
        updateDescendants(q.id, depth + 1);
      }
    });
  };
  updateDescendants(id, newDepth);
  saveQuantities(quantities);
  return updated;
}

export function deleteQuantity(id: string): boolean {
  const quantities = loadQuantities();
  const hasChildren = quantities.some((q) => q.parentId === id);
  if (hasChildren) return false;
  saveQuantities(quantities.filter((q) => q.id !== id));
  // Also delete readouts for this quantity
  const readouts = loadReadouts();
  saveReadouts(readouts.filter((r) => r.quantityId !== id));
  return true;
}

// Sort quantities in hierarchical order
export function sortQuantities(quantities: Quantity[]): Quantity[] {
  const result: Quantity[] = [];
  const addChildren = (parentId: string | null) => {
    quantities
      .filter((q) => q.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((q) => {
        result.push(q);
        addChildren(q.id);
      });
  };
  addChildren(null);
  return result;
}

// ============================================================
// Units
// ============================================================
export function loadUnits(): Unit[] {
  return load<Unit>(KEYS.units);
}

export function saveUnits(units: Unit[]) {
  save(KEYS.units, units);
}

export function getUserUnits(userId: string): Unit[] {
  const all = loadUnits();
  return all.filter((u) => u.userId === null || u.userId === userId);
}

export function createUnit(
  userId: string,
  data: { symbol: string; description: string; multiplier: number; baseId: string | null }
): Unit {
  const units = loadUnits();
  const now = new Date().toISOString();
  const unit: Unit = {
    id: uuidv4(),
    userId,
    symbol: data.symbol,
    description: data.description,
    multiplier: data.multiplier,
    baseId: data.baseId,
    createdAt: now,
    updatedAt: now,
  };
  saveUnits([...units, unit]);
  return unit;
}

export function updateUnit(
  id: string,
  data: Partial<{ symbol: string; description: string; multiplier: number }>
): Unit | null {
  const units = loadUnits();
  const idx = units.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const updated = { ...units[idx], ...data, updatedAt: new Date().toISOString() };
  units[idx] = updated;
  saveUnits(units);
  return updated;
}

export function rebaseUnit(id: string, baseId: string | null): Unit | null {
  const units = loadUnits();
  const idx = units.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const multiplier = !baseId ? 1 : units[idx].multiplier;
  const updated = { ...units[idx], baseId, multiplier, updatedAt: new Date().toISOString() };
  units[idx] = updated;
  saveUnits(units);
  return updated;
}

export function deleteUnit(id: string): boolean {
  const units = loadUnits();
  const hasSubunits = units.some((u) => u.baseId === id);
  if (hasSubunits) return false;
  saveUnits(units.filter((u) => u.id !== id));
  return true;
}

export function sortUnits(units: Unit[]): Unit[] {
  return [...units].sort((a, b) => {
    const aBase = a.baseId ? units.find((u) => u.id === a.baseId)?.symbol ?? a.symbol : a.symbol;
    const bBase = b.baseId ? units.find((u) => u.id === b.baseId)?.symbol ?? b.symbol : b.symbol;
    if (aBase !== bBase) return aBase.localeCompare(bBase);
    if (!!a.baseId !== !!b.baseId) return a.baseId ? 1 : -1;
    return a.symbol.localeCompare(b.symbol);
  });
}

// ============================================================
// Readouts
// ============================================================
export function loadReadouts(): Readout[] {
  return load<Readout>(KEYS.readouts);
}

export function saveReadouts(readouts: Readout[]) {
  save(KEYS.readouts, readouts);
}

export function getUserReadouts(userId: string): Readout[] {
  return loadReadouts().filter((r) => r.userId === userId);
}

export function createReadout(
  userId: string,
  data: { quantityId: string; value: number; unitId: string | null }
): Readout {
  const readout: Readout = {
    id: uuidv4(),
    userId,
    quantityId: data.quantityId,
    value: data.value,
    unitId: data.unitId,
    createdAt: new Date().toISOString(),
  };
  const readouts = loadReadouts();
  saveReadouts([...readouts, readout]);
  return readout;
}

export function deleteReadout(id: string) {
  saveReadouts(loadReadouts().filter((r) => r.id !== id));
}
