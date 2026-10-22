import PageHeader from '@/components/common/PageHeader';
import AccountingTab from '../components/AccountingTab';

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Accounting & Ledger"
        subtitle="Double-entry general ledger, chart of accounts, journal entries, and financial statements."
      />
      <AccountingTab />
    </div>
  );
}
