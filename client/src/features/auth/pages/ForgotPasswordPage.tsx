import { Link } from 'react-router-dom';
import { ArrowLeft, Key, UserGear } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { onLogoError, useSchoolIdentity } from '../../settings/hooks/useSchoolIdentity';

/**
 * The school's accounts are created by staff and the app sends no email, so a
 * forgotten password is reset by an administrator, who hands over a temporary
 * one (User Accounts → Reset password).
 */
export default function ForgotPasswordPage() {
  const { schoolName, logoSrc, schoolEmail, schoolPhone } = useSchoolIdentity();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <div className="space-y-3 text-center">
          <img
            src={logoSrc}
            alt=""
            className="mx-auto h-16 w-16 rounded-full object-cover shadow-md ring-4 ring-card"
            onError={onLogoError}
          />
          <h1 className="text-2xl font-bold text-foreground">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground">{schoolName} resets passwords in person, so nobody else can take over your account.</p>
        </div>

        <ol className="space-y-3">
          <li className="flex gap-3 rounded-xl bg-tile-blue p-4 text-sm text-tile-foreground">
            <UserGear size={20} className="mt-0.5 shrink-0" />
            <span>Ask the school office or an administrator to reset your password.{schoolPhone ? ` Phone: ${schoolPhone}.` : ''}</span>
          </li>
          <li className="flex gap-3 rounded-xl bg-tile-green p-4 text-sm text-tile-foreground">
            <Key size={20} className="mt-0.5 shrink-0" />
            <span>They will give you a temporary password. Sign in with it, then choose your own under My account.</span>
          </li>
        </ol>

        {schoolEmail && (
          <p className="text-center text-xs text-muted-foreground">
            Or email <a href={`mailto:${schoolEmail}`} className="font-medium text-primary hover:underline">{schoolEmail}</a>
          </p>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link to="/login"><ArrowLeft size={16} /> Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
