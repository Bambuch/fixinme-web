export type UserStatus = 'admin' | 'active' | 'restricted' | 'locked' | 'disabled';

export interface User {
  id: string;
  email: string;
  password: string;
  status: UserStatus;
  createdAt: string;
}

export interface Quantity {
  id: string;
  userId: string;
  name: string;
  description: string;
  parentId: string | null;
  depth: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  userId: string | null; // null = default/system unit
  symbol: string;
  description: string;
  multiplier: number;
  baseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Readout {
  id: string;
  userId: string;
  quantityId: string;
  value: number;
  unitId: string | null;
  createdAt: string;
}

export type FlashType = 'notice' | 'alert';

export interface Flash {
  id: string;
  type: FlashType;
  message: string;
}

export type Page = 'login' | 'register' | 'quantities' | 'units' | 'measurements';
