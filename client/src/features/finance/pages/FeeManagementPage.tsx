import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartBar, Faders, HandCoins, UsersThree, type Icon } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { financeApi } from '../api/financeApi';
import { apiError } from '../api/monthlyFeesApi';
import CollectPaymentTab from '../components/CollectPaymentTab';
import ClassFeesStatusTab from '../components/ClassFeesStatusTab';
import FeeReportTab from '../components/FeeReportTab';
import ClassFeesPanel from '../components/ClassFeesPanel';
import PaymentMethodsPanel from '../components/PaymentMethodsPanel';
import type { PaymentMethod } from '../types';

type Tab = 'collect' | 'classes' | 'report' | 'setup';

const TABS: { value: Tab; label: string; icon: Icon }[] = [
  { value: 'collect', label: 'Collect Payment', icon: HandCoins },
  { value: 'classes', label: 'Class Status', icon: UsersThree },
  { value: 'report', label: 'Fee Report', icon: ChartBar },
  { value: 'setup', label: 'Setup', icon: Faders },
];

const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v);

export default function FeeManagementPage() {
  const { showToast } = useToast();
  // The open tab lives in the URL (?tab=report) so a refresh or a shared link keeps it.
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'collect';
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  // A student picked on Class Status (or linked as ?student=), opened on Collect Payment.
  const [collectStudentId, setCollectStudentId] = useState<string | null>(() => params.get('student'));

  const loadMethods = useCallback(() => {
    financeApi.getPaymentMethods()
      .then(setPaymentMethods)
      .catch((err) => showToast(apiError(err, 'Could not load payment methods.'), 'error'));
  }, [showToast]);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  // ?student= is a one-off link (e.g. from the accountant dashboard): drop it once read,
  // so closing the panel and refreshing doesn't open that student again.
  useEffect(() => {
    if (!params.has('student')) return;
    const next = new URLSearchParams(params);
    next.delete('student');
    setParams(next, { replace: true });
  }, [params, setParams]);

  const openTab = (value: string) => {
    if (!isTab(value)) return;
    if (value !== 'collect') setCollectStudentId(null);
    setParams(value === 'collect' ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fees & Payments"
        subtitle="Take monthly fee payments, see who has paid in each class, and report on what is collected."
      />

      <Tabs value={tab} onValueChange={openTab} className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          {TABS.map(({ value, label, icon: TabIcon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <TabIcon size={16} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="collect" className="mt-0">
          <CollectPaymentTab paymentMethods={paymentMethods} initialStudentId={collectStudentId} />
        </TabsContent>

        <TabsContent value="classes" className="mt-0">
          <ClassFeesStatusTab
            paymentMethods={paymentMethods}
            onCollect={(id) => { setCollectStudentId(id); openTab('collect'); }}
          />
        </TabsContent>

        <TabsContent value="report" className="mt-0">
          <FeeReportTab />
        </TabsContent>

        <TabsContent value="setup" className="mt-0">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <ClassFeesPanel />
            <PaymentMethodsPanel methods={paymentMethods} onChanged={loadMethods} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
