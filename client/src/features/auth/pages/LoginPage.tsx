import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Envelope,
  Lock,
  Eye,
  EyeSlash,
  ArrowRight,
  SpinnerGap,
  WarningCircle
} from '@phosphor-icons/react';
import { useAuth } from "../../../hooks/useAuth";
import { authApi } from "../api/authApi";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShow] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const rolePathMap: Record<string, string> = {
    admin: "/dashboard/admin",
    principal: "/dashboard/principal",
    academic_officer: "/dashboard/academic-officer",
    teacher: "/dashboard/teacher",
    accountant: "/dashboard/accountant",
    student: "/student-portal",
    parent: "/parent-portal",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(accessToken, user, refreshToken, rememberMe);
      navigate(rolePathMap[user.role] ?? "/dashboard/admin");
    } catch (err: any) {
      if (err?.response) {
        setError(
          err.response.data?.message ||
            "Invalid credentials. Please verify your email and password."
        );
      } else {
        setError(
          "Unable to connect to the authentication server. Please check your network."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Image panel (large screens) */}
      <div className="relative hidden lg:flex lg:w-[40%] items-center justify-center overflow-hidden border-r border-border bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,hsl(var(--primary)/0.14),transparent_55%),radial-gradient(circle_at_80%_90%,hsl(var(--primary)/0.10),transparent_50%)]" />
        <div className="absolute h-[24rem] w-[24rem] rounded-full border border-primary/15" />
        <div className="absolute h-[34rem] w-[34rem] rounded-full border border-primary/10" />
        <img
          src="/logo.png"
          alt="Sobet School"
          className="relative h-60 w-60 xl:h-72 xl:w-72 rounded-full object-cover shadow-2xl ring-8 ring-background/70"
        />
      </div>

      {/* Authentication Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <img
            src="/logo.png"
            alt="Sobet School"
            className="mx-auto h-20 w-20 rounded-full object-cover shadow-md ring-4 ring-card lg:hidden"
          />

          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Enter your authorized credentials to access your dashboard
            </p>
          </div>

          <div>
            <div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email address
                  </Label>
                  <div className="relative">
                    <Envelope
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="pl-9 text-sm"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold">
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-9 pr-10 text-sm"
                      autoComplete="current-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShow(!showPassword)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                    </Button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer font-normal">
                    Keep me signed in for 30 days
                  </Label>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
                    <WarningCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 font-semibold shadow-xs"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <SpinnerGap size={16} className="animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In to Account
                      <ArrowRight size={15} />
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Having trouble logging in?{" "}
            <a
              href="mailto:support@sobet.edu"
              className="text-primary hover:underline font-medium"
            >
              Contact IT Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}