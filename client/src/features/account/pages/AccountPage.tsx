import PageHeader from '@/components/common/PageHeader';
import { useAuth } from '../../../hooks/useAuth';
import { roleLabel } from '../../../hooks/usePermission';
import AccountSettings from '../components/AccountSettings';

/** "My account", open to every signed-in person whatever their role. */
export default function AccountPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        title="My account"
        subtitle={user ? `${user.name} · ${roleLabel(user)}` : 'Your sign-in and how the app looks'}
      />
      <AccountSettings />
    </div>
  );
}
