import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Envelope, ArrowLeft, Shield, ArrowRight } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Brand panel shared by the sign-in screens. Fixed (not theme-dependent) so the
// white text on it stays readable in light and dark mode.
const AUTH_PANEL_GRADIENT = 'linear-gradient(160deg, hsl(160 84% 24%) 0%, hsl(168 72% 17%) 100%)';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: AUTH_PANEL_GRADIENT }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-60px] right-[-60px] w-80 h-80 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute top-[20px] right-[-100px] w-56 h-56 rounded-full border border-white/10 bg-white/5" />
        <div className="absolute bottom-[-80px] left-[-60px] w-72 h-72 rounded-full border border-white/10 bg-white/5" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img
            src="/logo.png" alt="Sobet School"
            className="w-16 h-16 rounded-full object-contain bg-white/10 p-1"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <p className="text-white font-bold text-xl leading-tight">Sobet School</p>
            <p className="text-info-foreground text-sm">Management System</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10">
          <h1 className="text-white font-bold text-4xl leading-tight mb-3">
            Secure Account<br />Recovery
          </h1>
          <p className="text-info-foreground text-base mb-10">
            We'll help you regain access to your account quickly and securely
          </p>

          {/* Glass card */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Shield size={20} className="text-white" />
              </div>
              <span className="text-white font-bold text-base">Secure Process</span>
            </div>
            <ul className="space-y-2">
              {['Email verification required', 'Secure password reset link', 'Link expires in 1 hour'].map(item => (
                <li key={item} className="flex items-center gap-2 text-info-foreground text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-info/25 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-info-foreground text-sm relative z-10">© 2026 Sobet School. All rights reserved.</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-card flex flex-col justify-center p-10 lg:p-16">
        <div className="w-full max-w-md mx-auto">

          {/* Back to login */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground/80 transition-colors mb-8"
          >
            <ArrowLeft size={15} /> Back to login
          </Link>

          {!sent ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  No worries! Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Envelope size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full border border-border bg-muted/50 rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">We'll send a password reset link to this email</p>
                </div>

                <Button variant="plain"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : <>Send Reset Link <ArrowRight size={16} /></>}
                </Button>
              </form>

              {/* Info card */}
              <div className="mt-6 bg-info/10 border border-info/20 rounded-xl p-4 flex items-start gap-3">
                <Envelope size={18} className="text-info shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">Didn't receive an email?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Check your spam folder or contact support if you don't receive the reset link within a few minutes.
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Still having trouble?{' '}
                <a href="mailto:support@sobet.edu" className="text-primary hover:text-primary font-semibold">
                  Contact Support
                </a>
              </p>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="20" r="18" stroke="hsl(var(--success))" strokeWidth="2.5" fill="none" />
                  <path d="M12 20l6 6 10-12" stroke="hsl(var(--success))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-3">Check Your Email</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                We've sent a password reset link to
              </p>
              <p className="text-primary font-bold text-sm mb-6">{email}</p>
              <p className="text-muted-foreground text-xs mb-8">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button variant="plain"
                onClick={() => setSent(false)}
                className="w-full border border-border bg-card hover:bg-muted/50 text-foreground/80 py-3.5 rounded-xl text-sm font-medium transition-colors mb-3"
              >
                Try a different email
              </Button>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <ArrowLeft size={15} /> Back to Sign In
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
