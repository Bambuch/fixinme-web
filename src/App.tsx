import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import type { User, Flash, Page } from './types';
import {
  getCurrentUser,
  setCurrentUserId,
  ensureDefaultUnits,
} from './store';
import { v4 as uuidv4 } from 'uuid';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import QuantitiesPage from './pages/QuantitiesPage';
import UnitsPage from './pages/UnitsPage';
import MeasurementsPage from './pages/MeasurementsPage';

// ============================================================
// Auth Context
// ============================================================
interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ============================================================
// Flash Context
// ============================================================
interface FlashContextValue {
  flashes: Flash[];
  addFlash: (type: Flash['type'], message: string) => void;
  removeFlash: (id: string) => void;
}

export const FlashContext = createContext<FlashContextValue>({
  flashes: [],
  addFlash: () => {},
  removeFlash: () => {},
});

export function useFlash() {
  return useContext(FlashContext);
}

// ============================================================
// App
// ============================================================
function App() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [page, setPage] = useState<Page>(() => (getCurrentUser() ? 'quantities' : 'login'));
  const [flashes, setFlashes] = useState<Flash[]>([]);

  useEffect(() => {
    ensureDefaultUnits();
  }, []);

  const login = useCallback((u: User) => {
    setCurrentUserId(u.id);
    setUser(u);
    setPage('quantities');
  }, []);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    setUser(null);
    setPage('login');
  }, []);

  const addFlash = useCallback((type: Flash['type'], message: string) => {
    const id = uuidv4();
    setFlashes((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.id !== id));
    }, 4000);
  }, []);

  const removeFlash = useCallback((id: string) => {
    setFlashes((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const navigateTo = useCallback((p: Page) => setPage(p), []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <FlashContext.Provider value={{ flashes, addFlash, removeFlash }}>
        {!user ? (
          <AuthPage mode={page === 'register' ? 'register' : 'login'} onNavigate={navigateTo} />
        ) : (
          <Layout currentPage={page} onNavigate={navigateTo}>
            {page === 'quantities' && <QuantitiesPage />}
            {page === 'units' && <UnitsPage />}
            {page === 'measurements' && <MeasurementsPage />}
          </Layout>
        )}
      </FlashContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
