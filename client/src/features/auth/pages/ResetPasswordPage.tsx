import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeSlash, ArrowRight, WarningCircle } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Brand panel shared by the sign-in screens. Fixed (not theme-dependent) so the
// white text on it stays readable in light and dark mode.
const AUTH_PANEL_GRADIENT = 'linear-gradient(160deg, hsl(160 84% 24%) 0%, hsl(168 72% 17%) 100%)';

const TIPS = [
  'Use a mix of letters, numbers, and symbols',
  'Avoid using personal information',
  "Don't reuse passwords from other sites",
  'Keep your password confidential',
];

function req(label: string, met: boolean) {
  return (
    <div key={label} className={`flex items-center gap-2 text-sm ${met ? 'text-primary' : 'text-muted-foreground'}`}>
      {met ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="hsl(var(--success))" strokeWidth="1.5" fill="none" />
          <path d="M5 8l2 2 4-4" stroke="hsl(var(--success))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="hsl(var(--border))" strokeWidth="1.5" fill="none" />
          <path d="M5.5 10.5l5-5M10.5 10.5l-5-5" stroke="hsl(var(--border))" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </div>
  );
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const checks = {
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    lower:     /[a-z]/.test(password),
    number:    /[0-9]/.test(password),
    match:     password.length > 0 && password === confirm,
  };
  const allMet = Object.values(checks).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allMet) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setDone(true);
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: AUTH_PANEL_GRADIENT }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-40px] right-[-60px] w-80 h-80 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute top-[60px] right-[-110px] w-60 h-60 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full border border-white/10 bg-white/5" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img
            src="/logo.png" alt="Sobet School"
            className="w-16 h-16 rounded-full object-contain bg-white/10 p-1"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <p className="text-white font-bold text-xl leading-tight">Sobet School</p>
            <p className="text-white/70 text-sm">Management System</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <h1 className="text-white font-bold text-4xl leading-tight mb-3">
            Create a Strong<br />New Password
          </h1>
          <p className="text-white/80 text-base mb-10">
            Your account security is our priority
          </p>

          {/* Glass card */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Lock size={20} className="text-white" />
              </div>
              <span className="text-white font-bold text-base">Password Tips</span>
            </div>
            <ul className="space-y-2">
              {TIPS.map(tip => (
                <li key={tip} className="flex items-center gap-2 text-white/80 text-sm">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-white/60 text-sm relative z-10">© 2026 Sobet School. All rights reserved.</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-card overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-10 lg:p-16">
        <div className="w-full max-w-md">

          {!done ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Reset Your Password</h2>
                <p className="text-muted-foreground text-sm">Create a strong password to secure your account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full border border-border bg-muted/50 rounded-xl pl-10 pr-11 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                    />
                    <Button variant="plain"
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full border border-border bg-muted/50 rounded-xl pl-10 pr-11 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                    />
                    <Button variant="plain"
                      type="button"
                      onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                    >
                      {showConfirm ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="border border-border rounded-xl p-4 space-y-2.5 bg-muted/50">
                  <p className="text-sm font-semibold text-foreground mb-1">Password Requirements:</p>
                  {req('At least 8 characters',      checks.length)}
                  {req('Contains uppercase letter',  checks.upper)}
                  {req('Contains lowercase letter',  checks.lower)}
                  {req('Contains number',            checks.number)}
                  {req('Passwords match',            checks.match)}
                </div>

                <Button variant="plain"
                  type="submit"
                  disabled={loading || !allMet}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : <>Reset Password <ArrowRight size={16} /></>}
                </Button>
              </form>

              {/* Important note */}
              <div className="mt-5 bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                <WarningCircle size={18} className="text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">Important</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    After resetting your password, you'll need to sign in again with your new credentials on all devices.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/20">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <circle cx="22" cy="22" r="20" stroke="hsl(var(--success))" strokeWidth="2.5" fill="none" />
                  <path d="M13 22l7 7 11-14" stroke="hsl(var(--success))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">Password Reset Successful!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs mx-auto">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>

              {/* What's Next card */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-start gap-3 text-left mb-6">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0 mt-0.5">
                  <circle cx="9" cy="9" r="8" stroke="hsl(var(--success))" strokeWidth="1.5" fill="none" />
                  <path d="M6 9l2 2 4-4" stroke="hsl(var(--success))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">What's Next?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    For your security, you've been logged out of all devices. Please sign in again using your new password.
                  </p>
                </div>
              </div>

              <Button variant="plain"
                onClick={() => navigate('/login')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Continue to Login <ArrowRight size={16} />
              </Button>
            </div>
          )}

        </div>
        </div>
      </div>
    </div>
  );
}
