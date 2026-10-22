import { BookOpen, CheckCircle, BookBookmark, Warning, Users, ArrowCounterClockwise, CurrencyDollar, BookmarkSimple, PlusCircle, ArrowsLeftRight, Wallet, ClockCounterClockwise, ChartBar, CaretRight, Sparkle, Check, ArrowUpRight } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatStrip from '@/components/shared/StatStrip';
import { useLibraryStore } from '../../store/libraryStore';
import {
  libraryStats, monthlyBorrowReturnTrend, topBorrowedBooks, recentActivity, daysLate, estimatedFine,
  pendingReservationsCount, bookById, formatUSD, formatDate,
} from '../../data/libraryData';
import type { TabId } from '../../types';

interface Props {
  onNavigate: (tab: TabId) => void;
  onAddBook: () => void;
}

type StatTone = 'sky' | 'emerald' | 'violet' | 'rose' | 'cyan' | 'teal' | 'amber' | 'indigo';

const TONE_STYLES: Record<StatTone, { iconBg: string; text: string; ring: string; gradient: string }> = {
  sky: {
    iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-500/20',
    text: 'text-sky-600 dark:text-sky-400',
    gradient: 'from-sky-500/10 to-transparent',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500/10 to-transparent',
  },
  violet: {
    iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    gradient: 'from-violet-500/10 to-transparent',
  },
  rose: {
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    gradient: 'from-rose-500/10 to-transparent',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    ring: 'ring-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    gradient: 'from-cyan-500/10 to-transparent',
  },
  teal: {
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    ring: 'ring-teal-500/20',
    text: 'text-teal-600 dark:text-teal-400',
    gradient: 'from-teal-500/10 to-transparent',
  },
  amber: {
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500/10 to-transparent',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    gradient: 'from-indigo-500/10 to-transparent',
  },
};

// Custom tooltip for Monthly Trend Bar Chart
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 text-popover-foreground border border-border shadow-xl rounded-xl p-3 backdrop-blur-md text-xs space-y-1.5">
        <p className="font-semibold border-b border-border/60 pb-1 text-foreground">{label} 2026</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardTab({ onNavigate, onAddBook }: Props) {
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);
  const reservations = useLibraryStore((s) => s.reservations);
  const fineRatePerDay = useLibraryStore((s) => s.settings.fineRatePerDay);

  const stats = libraryStats(books, records);
  const trend = monthlyBorrowReturnTrend(records);
  const top = topBorrowedBooks(books, records, 5);
  const activity = recentActivity(records, 6);
  const overdue = records.Funnel((r) => r.status === 'Active' && daysLate(r) > 0);
  const maxTopCount = top[0]?.count ?? 1;
  const reservedCount = pendingReservationsCount(reservations);

  const totalBorrowedThisYear = trend.reduce((acc, t) => acc + (t.Borrowed || 0), 0);
  const totalReturnedThisYear = trend.reduce((acc, t) => acc + (t.Returned || 0), 0);

  const quickActions = [
    {
      label: 'Add Book',
      sub: 'Register catalog title',
      icon: PlusCircle,
      tone: 'emerald' as const,
      action: onAddBook,
    },
    {
      label: 'Borrow Book',
      sub: 'Issue loan to student',
      icon: ArrowsLeftRight,
      tone: 'sky' as const,
      action: () => onNavigate('borrow'),
    },
    {
      label: 'Return Book',
      sub: 'Check-in & settle fines',
      icon: ArrowsLeftRight,
      tone: 'teal' as const,
      action: () => onNavigate('return'),
    },
    {
      label: 'Manage Fines',
      sub: 'Collect penalty balances',
      icon: Wallet,
      tone: 'amber' as const,
      action: () => onNavigate('fines'),
    },
    {
      label: 'Borrow History',
      sub: 'Full circulation audit',
      icon: ClockCounterClockwise,
      tone: 'violet' as const,
      action: () => onNavigate('history'),
    },
    {
      label: 'Analytics',
      sub: 'Trends & inventory insights',
      icon: ChartBar,
      tone: 'indigo' as const,
      action: () => onNavigate('analytics'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Stats Strip 1: Catalog & Circulation */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Collection &amp; Circulation Overview
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">Live inventory</span>
        </div>

        <StatStrip
          items={[
            {
              label: 'Total Books',
              value: stats.totalCopies,
              tone: 'sky',
              icon: BookOpen,
              hint: `${stats.uniqueTitles} unique titles`,
              onClick: () => onNavigate('catalog'),
            },
            {
              label: 'Available',
              value: stats.availableCopies,
              tone: 'emerald',
              icon: CheckCircle,
              hint: 'Ready for checkout',
              onClick: () => onNavigate('catalog'),
            },
            {
              label: 'Borrowed',
              value: stats.borrowedCount,
              tone: 'violet',
              icon: BookBookmark,
              hint: 'Active student loans',
              onClick: () => onNavigate('borrow'),
            },
            {
              label: 'Overdue',
              value: stats.overdueCount,
              tone: stats.overdueCount > 0 ? 'rose' : 'muted',
              icon: Warning,
              hint: stats.overdueCount > 0 ? `${stats.overdueCount} loans need follow-up` : 'All loans on schedule',
              onClick: () => onNavigate('return'),
            },
          ]}
        />
      </div>

      {/* KPI Stats Strip 2: Patron Activity & Financials */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patrons, Check-ins &amp; Fines
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">Daily activity</span>
        </div>

        <StatStrip
          items={[
            {
              label: 'Students Borrowing',
              value: stats.studentsBorrowing,
              tone: 'sky',
              icon: Users,
              hint: 'Currently active patrons',
              onClick: () => onNavigate('students'),
            },
            {
              label: 'Returned Today',
              value: stats.returnedToday,
              tone: 'emerald',
              icon: ArrowCounterClockwise,
              hint: 'Checked in today',
              onClick: () => onNavigate('return'),
            },
            {
              label: 'Outstanding Fines',
              value: formatUSD(stats.outstandingFines),
              tone: stats.outstandingFines > 0 ? 'rose' : 'emerald',
              icon: CurrencyDollar,
              hint: stats.outstandingFines > 0 ? 'Pending student payments' : 'All accounts settled',
              onClick: () => onNavigate('fines'),
            },
            {
              label: 'Reserved',
              value: reservedCount,
              tone: reservedCount > 0 ? 'amber' : 'muted',
              icon: BookmarkSimple,
              hint: reservedCount > 0 ? 'Holds awaiting release' : 'Zero pending holds',
            },
          ]}
        />
      </div>

      {/* Main Row: Activity Chart + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Monthly Trend Chart */}
        <Card className="xl:col-span-2 border-border/80 shadow-sm flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                Monthly Borrowing &amp; Returns
                <Badge variant="secondary" className="font-normal text-[10px] px-2 py-0.5">
                  Jan – Jul 2026
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Volume of books borrowed versus books safely returned
              </CardDescription>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Borrowed ({totalBorrowedThisYear})
              </span>
              <span className="flex items-center gap-1.5 font-medium text-sky-600 dark:text-sky-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                Returned ({totalReturnedThisYear})
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="borrowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="returnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0369a1" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="Borrowed" fill="url(#borrowGrad)" radius={[5, 5, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Returned" fill="url(#returnGrad)" radius={[5, 5, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="border-border/80 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
              <span>Quick Actions</span>
              <Sparkle className="h-4 w-4 text-primary" />
            </CardTitle>
            <CardDescription className="text-xs">
              Frequent desk workflows &amp; circulation shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5 pt-0">
            {quickActions.map((a) => {
              const tone = TONE_STYLES[a.tone];
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.action}
                  className="group flex flex-col items-start text-left p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all duration-200 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone.iconBg} ${tone.ring} ring-1 group-hover:Scales-105 transition-transform`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {a.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {a.sub}
                  </span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Row: Overdue Books & Top Borrowed Titles */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Overdue Books */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Overdue Books</span>
                {overdue.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                    {overdue.length} Action Needed
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Loans past their due date requiring patron follow-up
              </CardDescription>
            </div>
            {overdue.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('return')}
                className="text-xs font-semibold text-primary hover:text-primary/80 h-7 px-2"
              >
                Process returns
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {overdue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
                  <Check className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">All Books On Schedule</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  No active loans are currently overdue. The library circulation is running smoothly!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {overdue.map((r) => {
                  const book = bookById(books, r.bookId);
                  const late = daysLate(r);
                  const fine = estimatedFine(r, fineRatePerDay);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-3.5 py-3 transition-colors hover:bg-destructive/10"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {book?.title ?? 'Unknown Title'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="font-medium text-foreground/80">{r.studentName}</span>
                          <span>•</span>
                          <span>Roll #{r.rollNo}</span>
                          <span>•</span>
                          <span>Copy #{r.copyNo}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <Badge variant="destructive" className="text-[10px] font-semibold">
                            {late} {late === 1 ? 'day' : 'days'} late
                          </Badge>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {formatUSD(fine)} fine
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onNavigate('return')}
                          className="h-7 text-xs border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          Check In
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Borrowed Books */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                Top Borrowed Books
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Most popular catalog titles checked out by students
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold text-primary hover:text-primary/80 h-7 px-2"
            >
              View analytics
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {top.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                <BookOpen className="h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold text-foreground">No Borrowing Records Yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Once books are loaned to students, the most popular titles will rank here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {top.map(({ book, count }, i) => {
                  const rankBadge =
                    i === 0
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : i === 1
                      ? 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30'
                      : i === 2
                      ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
                      : 'bg-muted text-muted-foreground border-border';

                  return (
                    <div key={book.id} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border shrink-0 ${rankBadge}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {book.title}
                          </p>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {count} {count === 1 ? 'checkout' : 'checkouts'}
                          </Badge>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(8, (count / maxTopCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Library Activity Feed */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Recent Library Activity
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Live audit stream of checkouts, returns and collection updates
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('history')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 h-7 px-2"
          >
            <span>View all activity</span>
            <CaretRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
              <ClockCounterClockwise className="h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="text-sm font-semibold text-foreground">No Activity Logged Yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                As books are issued and returned at the desk, events will stream into this feed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {activity.map(({ record, eventDate, event }) => {
                const book = bookById(books, record.bookId);
                const isReturn = event === 'Returned';
                return (
                  <div
                    key={`${record.id}-${event}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/20 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isReturn
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        }`}
                      >
                        {isReturn ? (
                          <ArrowCounterClockwise className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowsLeftRight className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {record.studentName}
                          <span className="text-muted-foreground font-normal ml-1.5">
                            ({record.className || `Roll #${record.rollNo}`})
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {book?.title ?? 'Unknown Title'} • Copy #{record.copyNo}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {formatDate(eventDate)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          isReturn
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                            : 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20'
                        }`}
                      >
                        {event}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
