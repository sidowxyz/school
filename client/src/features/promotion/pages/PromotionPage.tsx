import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListDashes, ClipboardText, ClockCounterClockwise as HistoryIcon, ArrowRight } from '@phosphor-icons/react';
import PageHeader from '../../../components/common/PageHeader';
import SetupTab from '../components/tabs/SetupTab';
import ReviewTab from '../components/tabs/ReviewTab';
import HistoryTab from '../components/tabs/HistoryTab';
import { TAB_IDS, type TabId } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'setup', label: 'Setup', icon: ListDashes },
  { id: 'review', label: 'Review & Promote', icon: ClipboardText },
  { id: 'history', label: 'History', icon: HistoryIcon },
];

function PromotionPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const tabParam = searchParams.get('tab');
  const tab: TabId = (TAB_IDS as string[]).includes(tabParam ?? '') ? (tabParam as TabId) : 'setup';

  const setTab = (next: TabId) => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous);
      params.set('tab', next);
      return params;
    });
  };

  const startReview = (classId: string) => {
    setSelectedClassId(classId);
    setTab('review');
  };

  const backToSetup = () => {
    setSelectedClassId(null);
    setTab('setup');
  };

  const afterConfirmed = () => {
    setSelectedClassId(null);
    setTab('history');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Promotion"
        subtitle="Promote passing students, retain others, and keep a full audit trail at the end of each academic year"
      />

      {/* Modern Pill Tabs Bar */}
      <Card className="border-border/80 shadow-2xs p-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                tab === item.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'setup' && <SetupTab onSelectClass={startReview} />}
      {tab === 'review' &&
        (selectedClassId ? (
          <ReviewTab classId={selectedClassId} onBack={backToSetup} onConfirmed={afterConfirmed} />
        ) : (
          <Card className="border-border/80 shadow-2xs">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-muted/60 border border-border/60 mx-auto flex items-center justify-center text-muted-foreground/60">
                <ListDashes size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No class selected for review</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Pick a class cohort from the Setup tab to evaluate pass/fail criteria and start a promotion review.
                </p>
              </div>
              <div>
                <Button
                  onClick={() => setTab('setup')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                >
                  Go to Setup <ArrowRight size={13} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}

export default function PromotionPage() {
  return <PromotionPageContent />;
}
