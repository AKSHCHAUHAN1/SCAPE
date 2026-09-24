import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { authApi } from '../../api/auth.js';
import { useAuthStore } from '../../store/authStore.js';
import type { UserRole } from '../../types/index.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const loginToStore = useAuthStore((state) => state.login);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('developer');
  const [teamId, setTeamId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const data = await authApi.login({ email, password });
        loginToStore(data.accessToken, data.user);
        setSuccessMsg('Authentication successful. Redirecting...');
        setTimeout(() => navigate('/services'), 400);
      } else {
        const data = await authApi.register({
          email,
          password,
          role,
          teamId: teamId.trim() || undefined,
        });
        loginToStore(data.accessToken, data.user);
        setSuccessMsg('Account created successfully. Redirecting...');
        setTimeout(() => navigate('/services'), 400);
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.details?.errors?.[0]?.message ||
        'Authentication failed. Please check your credentials.';
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-md bg-surface/90 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/25 mb-4">
            <Terminal className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            SCAPE
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Enterprise Internal Developer Platform
          </p>
        </div>

        {/* Mode Toggle (Sign In / Register) */}
        <div className="flex bg-bg-tertiary/60 p-1 rounded-xl mb-6 border border-border/50">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === 'login'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              mode === 'register'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3 text-danger text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 p-3.5 bg-success/10 border border-success/30 rounded-xl flex items-start gap-3 text-success text-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                className="w-full bg-bg/70 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 pl-11 pr-4 text-sm text-text placeholder-text-muted transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-bg/70 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 pl-11 pr-4 text-sm text-text placeholder-text-muted transition-all outline-none"
              />
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-bg/70 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 pl-11 pr-4 text-sm text-text placeholder-text-muted transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Platform Role
                </label>
                <div className="relative">
                  <Shield className="w-5 h-5 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-bg/70 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 pl-11 pr-4 text-sm text-text outline-none appearance-none"
                  >
                    <option value="developer">Developer</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="devops">DevOps Engineer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Team ID <span className="text-text-muted normal-case">(Optional UUID)</span>
                </label>
                <input
                  type="text"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="e.g. 11111111-1111-1111-1111-111111111111"
                  className="w-full bg-bg/70 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 px-4 text-sm text-text placeholder-text-muted transition-all outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-primary to-primary-hover text-white font-medium rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 focus:ring-2 focus:ring-primary/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to SCAPE' : 'Create Platform Account'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Accounts */}
        <div className="mt-6 pt-5 border-t border-border/60">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2 text-center">
            Quick Demo Sign-In
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: 'Admin', email: 'admin@scape.dev', role: 'admin' },
              { label: 'DevOps', email: 'devops@scape.dev', role: 'devops' },
              { label: 'Team Lead', email: 'lead@scape.dev', role: 'team_lead' },
              { label: 'Developer', email: 'dev@scape.dev', role: 'developer' },
            ].map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => {
                  setMode('login');
                  setEmail(acc.email);
                  setPassword('Password123!');
                }}
                className="p-2 rounded-xl bg-bg-secondary hover:bg-bg-tertiary border border-border text-left transition-colors cursor-pointer"
              >
                <span className="font-semibold text-text block">{acc.label}</span>
                <span className="text-[10px] text-text-muted truncate block">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Security Badging */}
        <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-center gap-2 text-xs text-text-muted">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Secured with JWT HttpOnly Tokens & RBAC Policies</span>
        </div>
      </div>
    </div>
  );
}
