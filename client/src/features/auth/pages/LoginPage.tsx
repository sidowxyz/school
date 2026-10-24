import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Envelope, Eye, EyeSlash, Lock, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from "../../../hooks/useAuth";
import { authApi } from "../api/authApi";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { homePathFor } from "../../../hooks/usePermission";
import { useSchoolIdentity } from "../../settings/hooks/useSchoolIdentity";
import AuthLayout from "../components/AuthLayout";

export default function LoginPage() {
  const { schoolName, schoolEmail } = useSchoolIdentity();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShow] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(accessToken, user, refreshToken, rememberMe);
      navigate(homePathFor(user));
    } catch (err: any) {
      if (err?.response) {
        setError(err.response.data?.message || "That email and password don't match. Check them and try again.");
      } else {
        setError("Can't reach the server. Check your internet connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sign in</h1>
          <p className="text-sm text-muted-foreground">Welcome back to {schoolName}.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Envelope size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.com"
                className="h-12 rounded-xl pl-11 text-[15px]"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="h-12 rounded-xl pl-11 pr-12 text-[15px]"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShow(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} />
            <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-muted-foreground">Keep me signed in for 30 days</Label>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <WarningCircle size={18} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button size="lg" type="submit" disabled={loading} className="h-12 w-full text-[15px]">
            {loading ? <><SpinnerGap size={18} className="animate-spin" /> Signing in…</> : <>Sign in <ArrowRight size={18} /></>}
          </Button>
        </form>

        <div className="rounded-2xl bg-muted/60 px-4 py-3.5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Need an account or locked out?</p>
          <p className="mt-0.5">
            Accounts are made by the school office.{schoolEmail ? <> Email <a href={`mailto:${schoolEmail}`} className="font-medium text-primary hover:underline">{schoolEmail}</a>.</> : ' Ask them for help.'}
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
