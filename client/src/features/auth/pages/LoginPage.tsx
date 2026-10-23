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
      <div className="hidden lg:block lg:w-1/2 shrink-0 p-4 bg-background">
        <div className="relative h-full min-h-[calc(100vh-2rem)] overflow-hidden rounded-3xl bg-card shadow-sm">
          <img
            src="/Images/Left%20side%20image.jpg"
            alt="Students reading in class"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

          <div className="absolute left-6 top-6 flex items-center gap-3 rounded-2xl bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
            <img src="/logo.png" alt="Sobet School" className="h-9 w-9 rounded-full object-cover" />
            <span className="text-sm font-semibold text-foreground">Horn of Africa Academy</span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-8 xl:p-10 text-white">
            <h2 className="text-2xl xl:text-3xl font-bold leading-tight tracking-tight">
              Every student, every lesson, in one place.
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/80">
              Manage classes, attendance, results and fees with the school management system.
            </p>
          </div>
        </div>
      </div>

      {/* Authentication Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-muted/40">
        <div className="w-full max-w-md space-y-7 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <img
            src="/logo.png"
            alt="Sobet School"
            className="mx-auto h-16 w-16 rounded-full object-cover shadow-md ring-4 ring-card"
          />

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
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
                      className="h-11 rounded-xl bg-muted/40 pl-9 text-sm"
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
                      className="h-11 rounded-xl bg-muted/40 pl-9 pr-10 text-sm"
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
                  className="h-11 w-full mt-2 rounded-xl font-semibold shadow-sm"
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