import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChartBar, Exam, NotePencil, type Icon } from '@phosphor-icons/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { useCan } from '../../../hooks/usePermission';
import { academicApi } from '../../academic-structure/api/academicApi';
import type { Class, Section, Term } from '../../academic-structure/types';
import { examsApi, apiMessage } from '../api/examsApi';
import type { ExamItem } from '../types';
import ExamsTab from '../components/ExamsTab';
import MarkEntryTab from '../components/MarkEntryTab';
import ResultsTab from '../components/ResultsTab';

type Tab = 'exams' | 'marks' | 'results';
const TABS: { value: Tab; label: string; icon: Icon }[] = [
  { value: 'exams', label: 'Exams', icon: Exam },
  { value: 'marks', label: 'Enter marks', icon: NotePencil },
  { value: 'results', label: 'Results', icon: ChartBar },
];
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v);

export default function ExamsPage() {
  const { showToast } = useToast();
  const canManage = useCan('exams', 'create');
  const [params, setParams] = useSearchParams();
  // Teachers mostly come here to enter marks, so that's where they land.
  const defaultTab: Tab = canManage ? 'exams' : 'marks';
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : defaultTab;
  const examId = params.get('exam') ?? '';

  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);

  const loadExams = useCallback(() => {
    examsApi.list().then(setExams).catch((err) => showToast(apiMessage(err, 'Could not load exams.'), 'error'));
  }, [showToast]);

  useEffect(() => {
    Promise.all([academicApi.getTerms(), academicApi.getClasses(), academicApi.getSections()])
      .then(([t, c, s]) => {
        setTerms([...t].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')));
        setClasses([...c].sort((a, b) => a.cl_name.localeCompare(b.cl_name, undefined, { numeric: true })));
        setSections(s);
      })
      .catch((err) => showToast(apiMessage(err, 'Could not load classes and terms.'), 'error'));
    loadExams();
  }, [loadExams, showToast]);

  const open = (next: Tab, exam?: string) => {
    const p: Record<string, string> = {};
    if (next !== defaultTab) p.tab = next;
    if (exam) p.exam = exam;
    setParams(p, { replace: true });
    if (next === 'marks') loadExams();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams & Marks"
        subtitle={canManage ? 'Set up exams, enter marks and publish results.' : 'Enter marks for your classes and see results.'}
      />

      <Tabs value={tab} onValueChange={(v) => isTab(v) && open(v, v === 'marks' ? examId : undefined)} className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          {TABS.map(({ value, label, icon: TabIcon }) => (
            <TabsTrigger key={value} value={value} className="gap-2"><TabIcon size={16} /> {label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="exams" className="mt-0">
          <ExamsTab terms={terms} classes={classes} canManage={canManage} onEnterMarks={(exam) => open('marks', exam._id)} />
        </TabsContent>
        <TabsContent value="marks" className="mt-0">
          <MarkEntryTab exams={exams} examId={examId} onExamChange={(id) => open('marks', id)} />
        </TabsContent>
        <TabsContent value="results" className="mt-0">
          <ResultsTab terms={terms} classes={classes} sections={sections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
