import { Link } from 'react-router-dom';
import { ArrowLeft, Key, UserGear } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useSchoolIdentity } from '../../settings/hooks/useSchoolIdentity';
import AuthLayout from '../components/AuthLayout';

/**
 * The school's accounts are created by staff and the app sends no email, so a
 * forgotten password is reset by an administrator, who hands over a temporary
 * one (User Accounts → Reset password).
 */
export default function ForgotPasswordPage() {
  const { schoolName, schoolEmail, schoolPhone } = useSchoolIdentity();

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground">{schoolName} resets passwords in person, so nobody else can take over your account.</p>
        </div>

        <ol className="space-y-3">
          <li className="flex gap-3 rounded-2xl bg-tile-blue p-4 text-sm text-tile-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card/70"><UserGear size={18} weight="duotone" /></span>
            <span><span className="block font-semibold">1. Ask the school office</span>An administrator resets your password.{schoolPhone ? ` Phone: ${schoolPhone}.` : ''}</span>
          </li>
          <li className="flex gap-3 rounded-2xl bg-tile-green p-4 text-sm text-tile-foreground">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card/70"><Key size={18} weight="duotone" /></span>
            <span><span className="block font-semibold">2. Sign in and change it</span>Use the temporary password they give you, then choose your own under My Account.</span>
          </li>
        </ol>

        {schoolEmail && (
          <p className="text-sm text-muted-foreground">
            Or email <a href={`mailto:${schoolEmail}`} className="font-medium text-primary hover:underline">{schoolEmail}</a>.
          </p>
        )}

        <Button asChild variant="outline" size="lg" className="h-12 w-full">
          <Link to="/login"><ArrowLeft size={18} /> Back to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
