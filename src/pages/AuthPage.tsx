import { useState } from 'react';
import type { Page } from '../types';
import { useAuth, useFlash } from '../App';
import { loginUser, registerUser } from '../store';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (page: Page) => void;
}

export default function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { login } = useAuth();
  const { addFlash } = useFlash();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    const user = loginUser(email, password);
    if (!user) {
      setErrors(['Nieprawidłowy email lub hasło.']);
      return;
    }
    addFlash('notice', `Zalogowano jako ${user.email}`);
    login(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    const errs: string[] = [];
    if (!email) errs.push('Email jest wymagany.');
    if (password.length < 6) errs.push('Hasło musi mieć co najmniej 6 znaków.');
    if (password !== passwordConfirm) errs.push('Hasła nie są identyczne.');
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    const user = registerUser(email, password);
    if (!user) {
      setErrors(['Ten adres email jest już zajęty.']);
      return;
    }
    addFlash('notice', `Konto zostało utworzone. Witaj, ${user.email}!`);
    login(user);
  };

  const isLogin = mode === 'login';

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="app-logo-large">fixin.me</span>
          <span className="auth-tagline">Quantified Self — śledź swoje pomiary</span>
        </div>

        {errors.length > 0 && (
          <div className="auth-errors">
            {errors.map((e, i) => (
              <div key={i} className="auth-error">
                {e}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={isLogin ? handleLogin : handleRegister} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="twoj@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="password-confirm">Potwierdź hasło</label>
              <input
                id="password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                placeholder="••••••"
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full">
            {isLogin ? (
              <>
                <LogIn size={16} />
                Zaloguj się
              </>
            ) : (
              <>
                <UserPlus size={16} />
                Zarejestruj się
              </>
            )}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? (
            <>
              Nie masz konta?{' '}
              <button className="link-btn" onClick={() => onNavigate('register')}>
                Zarejestruj się
              </button>
            </>
          ) : (
            <>
              Masz już konto?{' '}
              <button className="link-btn" onClick={() => onNavigate('login')}>
                Zaloguj się
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
