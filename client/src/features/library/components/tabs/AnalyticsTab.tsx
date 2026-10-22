import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { SectionCard } from '../shared';
import { useLibraryStore } from '../../store/libraryStore';
import {
  topBorrowedBooks, categoryDistribution, monthlyBorrowReturnTrend, libraryStats,
} from '../../data/libraryData';
import type { BookCategory } from '../../types';

const CATEGORY_HEX: Record<BookCategory, string> = {
  Mathematics: '#3b82f6',
  Science: '#14b8a6',
  Fiction: '#a855f7',
  History: '#f59e0b',
  Language: '#ec4899',
  'Computer Science': '#6366f1',
  'Religious Studies': '#16a34a',
  Geography: '#06b6d4',
};

const STATUS_COLORS = { Available: '#16a34a', Borrowed: '#3b82f6', Overdue: '#ef4444' };

export default function AnalyticsTab() {
  const books = useLibraryStore((s) => s.books);
  const records = useLibraryStore((s) => s.records);

  const top = topBorrowedBooks(books, records, 6).map((t) => ({ name: t.book.title.length > 22 ? `${t.book.title.slice(0, 22)}…` : t.book.title, count: t.count }));
  const categories = categoryDistribution(books).map((c) => ({ name: c.category, value: c.count, color: CATEGORY_HEX[c.category] }));
  const trend = monthlyBorrowReturnTrend(records);
  const stats = libraryStats(books, records);

  const statusData = [
    { name: 'Available', value: stats.availableCopies, color: STATUS_COLORS.Available },
    { name: 'Borrowed', value: stats.borrowedCount - stats.overdueCount, color: STATUS_COLORS.Borrowed },
    { name: 'Overdue', value: stats.overdueCount, color: STATUS_COLORS.Overdue },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionCard title="Top Borrowed Books" subtitle="Total times borrowed">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Catalog by Category" subtitle="Unique titles per category">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={categories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {categories.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionCard title="Borrowing Trend" subtitle="Books borrowed vs. returned per month">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Borrowed" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Returned" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Collection Status" subtitle="Available vs. borrowed vs. overdue copies">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  );
}
