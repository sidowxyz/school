import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SquaresFour, BookOpen, ArrowsLeftRight, ClockCounterClockwise, Wallet, Users, ChartBar, DownloadSimple, Plus, Gear, Clock } from '@phosphor-icons/react';
import PageHeader from '../../../components/common/PageHeader';
import BookFormModal from '../components/modals/BookFormModal';
import LibrarySettingsModal from '../components/modals/LibrarySettingsModal';
import DashboardTab from '../components/tabs/DashboardTab';
import CatalogTab from '../components/tabs/CatalogTab';
import BorrowTab from '../components/tabs/BorrowTab';
import ReturnTab from '../components/tabs/ReturnTab';
import ReadingTab from '../components/tabs/ReadingTab';
import HistoryTab from '../components/tabs/HistoryTab';
import FinesTab from '../components/tabs/FinesTab';
import StudentHistoryTab from '../components/tabs/StudentHistoryTab';
import AnalyticsTab from '../components/tabs/AnalyticsTab';
import { useLibraryStore } from '../store/libraryStore';
import { downloadCSV } from '../utils/csv';
import { bookById, isOverdue, formatDate } from '../data/libraryData';
import { TAB_IDS, type TabId } from '../types';
import type { Book } from '../types';
import { Button } from '@/components/ui/button';

const EXPORTABLE_TABS: Partial<Record<TabId, string>> = {
  catalog: 'Book Catalog',
  borrow: 'Active Loans',
  return: 'Recent Returns',
  history: 'Borrow History',
  fines: 'Fine Records',
};

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard',       icon: SquaresFour },
  { id: 'catalog',   label: 'Book Catalog',    icon: BookOpen },
  { id: 'borrow',    label: 'Borrow Book',     icon: ArrowsLeftRight },
  { id: 'return',    label: 'Return Book',     icon: ArrowsLeftRight },
  { id: 'reading',   label: 'Reading',         icon: Clock },
  { id: 'history',   label: 'Borrow History',  icon: ClockCounterClockwise },
  { id: 'fines',     label: 'Fine Management', icon: Wallet },
  { id: 'students',  label: 'Student History', icon: Users },
  { id: 'analytics', label: 'Analytics',       icon: ChartBar },
];

function LibraryPageContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);
  const loadBooks = useLibraryStore((s) => s.loadBooks);
  const loadRecords = useLibraryStore((s) => s.loadRecords);

  // Fetch the real catalog + borrow records from the backend on mount.
  useEffect(() => { loadBooks(); loadRecords(); }, [loadBooks, loadRecords]);

  const tabParam = searchParams.get('tab');
  const tab: TabId = (TAB_IDS as string[]).includes(tabParam ?? '') ? (tabParam as TabId) : 'dashboard';

  const setTab = (next: TabId) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('tab', next);
      return params;
    });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function openAddBook() {
    setEditingBook(undefined);
    setModalOpen(true);
  }

  function openEditBook(book: Book) {
    setEditingBook(book);
    setModalOpen(true);
  }

  function exportCatalog() {
    downloadCSV('book-catalog', books.map((b) => ({
      Title: b.title, Author: b.author, ISBN: b.isbn, Category: b.category,
      Available: b.availableCopies, Total: b.totalCopies, Rack: b.rack, Added: formatDate(b.addedDate),
    })));
  }

  function exportBorrow() {
    downloadCSV('active-loans', records.Funnel((r) => r.status === 'Active').map((r) => ({
      Book: bookById(books, r.bookId)?.title ?? '', CopyNo: r.copyNo, Student: r.studentName, Roll: r.rollNo,
      Borrowed: formatDate(r.borrowDate), Due: formatDate(r.dueDate), Status: isOverdue(r) ? 'Overdue' : 'Active',
    })));
  }

  function exportReturn() {
    downloadCSV('recent-returns', records.Funnel((r) => r.status === 'Returned').map((r) => ({
      Book: bookById(books, r.bookId)?.title ?? '', CopyNo: r.copyNo, Student: r.studentName,
      Returned: r.returnDate ? formatDate(r.returnDate) : '', Fine: r.fine,
    })));
  }

  function exportHistory() {
    downloadCSV('borrow-history', records.map((r) => ({
      Book: bookById(books, r.bookId)?.title ?? '', CopyNo: r.copyNo, Student: r.studentName, Roll: r.rollNo,
      Borrowed: formatDate(r.borrowDate), Due: formatDate(r.dueDate), Returned: r.returnDate ? formatDate(r.returnDate) : '',
      Status: isOverdue(r) ? 'Overdue' : r.status, Fine: r.fine,
    })));
  }

  function exportFines() {
    downloadCSV('fine-records', records.Funnel((r) => r.status === 'Returned' && r.fine > 0).map((r) => ({
      Student: r.studentName, Roll: r.rollNo, Book: bookById(books, r.bookId)?.title ?? '',
      Returned: r.returnDate ? formatDate(r.returnDate) : '', Fine: r.fine, Status: r.finePaid ? 'Paid' : 'Unpaid',
    })));
  }

  function handleExport() {
    if (tab === 'catalog') return exportCatalog();
    if (tab === 'borrow') return exportBorrow();
    if (tab === 'return') return exportReturn();
    if (tab === 'history') return exportHistory();
    if (tab === 'fines') return exportFines();
    return exportCatalog();
  }

  const activeLoansCount = records.Funnel((r) => r.status === 'Active').length;
  const overdueLoansCount = records.Funnel((r) => isOverdue(r)).length;
  const unpaidFinesCount = records.Funnel((r) => r.status === 'Returned' && r.fine > 0 && !r.finePaid).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Library Management"
        subtitle="Catalogue, book lending, returns, student reading logs, and fine tracking"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              title="Library settings"
              className="h-9 w-9 rounded-lg border-border/80 hover:bg-muted/60"
            >
              <Gear className="h-4 w-4 text-muted-foreground" />
            </Button>
            {EXPORTABLE_TABS[tab] && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-1.5 text-xs h-9 rounded-lg border-border/80 hover:bg-muted/60 font-medium"
              >
                <DownloadSimple className="h-3.5 w-3.5" />
                Export {EXPORTABLE_TABS[tab]}
              </Button>
            )}
            <Button
              size="sm"
              onClick={openAddBook}
              className="gap-1.5 text-xs font-semibold shadow-xs h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Book
            </Button>
          </div>
        }
      />

      {/* Sub-navigation bar */}
      <div className="bg-muted/60 border border-border/80 rounded-xl p-1.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;

            let badgeCount: number | null = null;
            let badgeVariant: 'default' | 'secondary' | 'destructive' | 'warning' = 'secondary';

            if (t.id === 'borrow' && activeLoansCount > 0) {
              badgeCount = activeLoansCount;
              badgeVariant = 'secondary';
            } else if (t.id === 'return' && overdueLoansCount > 0) {
              badgeCount = overdueLoansCount;
              badgeVariant = 'destructive';
            } else if (t.id === 'fines' && unpaidFinesCount > 0) {
              badgeCount = unpaidFinesCount;
              badgeVariant = 'warning';
            }

            return (
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all rounded-lg ${
                  isActive
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{t.label}</span>
                {badgeCount !== null && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      badgeVariant === 'destructive'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : badgeVariant === 'warning'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {badgeCount}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {tab === 'dashboard' && <DashboardTab onNavigate={setTab} onAddBook={openAddBook} />}
      {tab === 'catalog' && <CatalogTab onAddBook={openAddBook} onEditBook={openEditBook} />}
      {tab === 'borrow' && <BorrowTab />}
      {tab === 'return' && <ReturnTab />}
      {tab === 'reading' && <ReadingTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'fines' && <FinesTab />}
      {tab === 'students' && <StudentHistoryTab />}
      {tab === 'analytics' && <AnalyticsTab />}

      {modalOpen && <BookFormModal book={editingBook} onClose={() => setModalOpen(false)} />}
      {settingsOpen && <LibrarySettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default function LibraryPage() {
  return <LibraryPageContent />;
}
