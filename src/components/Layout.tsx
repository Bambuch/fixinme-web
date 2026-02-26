import type { ReactNode } from 'react';
import type { Page } from '../types';
import { useAuth, useFlash } from '../App';
import {
  LayoutDashboard,
  Ruler,
  ClipboardList,
  LogOut,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { flashes, removeFlash } = useFlash();

  const tabs: { page: Page; label: string; icon: ReactNode }[] = [
    { page: 'quantities', label: 'Wielkości', icon: <LayoutDashboard size={16} /> },
    { page: 'units', label: 'Jednostki', icon: <Ruler size={16} /> },
    { page: 'measurements', label: 'Pomiary', icon: <ClipboardList size={16} /> },
  ];

  return (
    <div className="app-shell">
      {/* Flash messages */}
      <div className="flashes">
        {flashes.map((flash) => (
          <div key={flash.id} className={`flash flash-${flash.type}`}>
            <span className="flash-icon">
              {flash.type === 'notice' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            </span>
            <span className="flash-message">{flash.message}</span>
            <button className="flash-close" onClick={() => removeFlash(flash.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="app-title">
          <span className="app-logo">fixin.me</span>
          <span className="app-subtitle">Quantified Self</span>
        </div>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button className="btn btn-ghost" onClick={logout} title="Wyloguj">
            <LogOut size={16} />
            <span>Wyloguj</span>
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        {tabs.map(({ page, label, icon }) => (
          <button
            key={page}
            className={`nav-tab ${currentPage === page ? 'nav-tab-active' : ''}`}
            onClick={() => onNavigate(page)}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Page content */}
      <main className="app-main">{children}</main>
    </div>
  );
}
