import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DownloadSimple, Plus, CurrencyDollar, CheckCircle, WarningCircle, TrendUp, CaretDown, X, Check, Eye, Printer, MagnifyingGlass, Funnel, Wallet, Clock } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ChartPie, Pie, Cell, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

// Data
const monthlyData = [
  { month: 'Jan', Revenue: 48000, Target: 50000 },
  { month: 'Feb', Revenue: 45000, Target: 48000 },
  { month: 'Mar', Revenue: 52000, Target: 50000 },
  { month: 'Apr', Revenue: 46000, Target: 49000 },
  { month: 'May', Revenue: 49000, Target: 49000 },
  { month: 'Jun', Revenue: 47000, Target: 48000 },
];

const pieData = [
  { name: 'Paid',    value: 308000, color: '#16a34a' },
  { name: 'Partial', value: 25000,  color: '#f59e0b' },
  { name: 'Pending', value: 18000,  color: '#3b82f6' },
  { name: 'Overdue', value: 8000,   color: '#ef4444' },
];

const weeklyData = [
  { week: 'Week 1', Collected: 12500, Target: 13000 },
  { week: 'Week 2', Collected: 11500, Target: 13000 },
  { week: 'Week 3', Collected: 13800, Target: 13200 },
  { week: 'Week 4', Collected: 13200, Target: 13000 },
];

const STUDENTS = [
  'Ahmed Mohamed Hassan - SB-2024-001',
  'Fatima Ali Omar - SB-2024-002',
  'Mohamed Abdi Jama - SB-2024-003',
  'Amina Hassan Yusuf - SB-2024-004',
  'Omar Mahmoud Ali - SB-2024-005',
];

const INVOICES = [
  'INV-2026-001 - $0',
  'INV-2026-002 - $200',
  'INV-2026-003 - $500',
  'INV-2026-004 - $500',
  'INV-2026-005 - $0',
];

const METHODS = ['Cash', 'Bank Transfer', 'Credit/Debit Card', 'Mobile Money', 'Cheque'];

const TABS = ['Dashboard', 'Invoices', 'Payments', 'Scholarships'];

// Invoice data
const INVOICES_DATA = [
  { id: 'INV-2026-001', student: 'Ahmed Mohamed Hassan', roll: 'SB-2024-001', grade: 'Grade 10-A', feeType: 'Tuition Fee - Semester 1', amount: 500, paid: 500, balance: 0,   dueDate: '2026-01-15', issueDate: '2026-01-05', paymentDate: '2026-01-10', status: 'Paid' },
  { id: 'INV-2026-002', student: 'Fatima Ali Omar',      roll: 'SB-2024-002', grade: 'Grade 11-A', feeType: 'Tuition Fee - Semester 1', amount: 500, paid: 300, balance: 200, dueDate: '2026-01-15', issueDate: '2026-01-05', paymentDate: '',           status: 'Partial' },
  { id: 'INV-2026-003', student: 'Mohamed Abdi Jama',    roll: 'SB-2024-003', grade: 'Grade 10-B', feeType: 'Tuition Fee - Semester 1', amount: 500, paid: 0,   balance: 500, dueDate: '2026-01-15', issueDate: '2026-01-05', paymentDate: '',           status: 'Overdue' },
  { id: 'INV-2026-004', student: 'Amina Hassan Yusuf',   roll: 'SB-2024-004', grade: 'Grade 9-A',  feeType: 'Tuition Fee - Semester 1', amount: 500, paid: 0,   balance: 500, dueDate: '2026-06-15', issueDate: '2026-01-05', paymentDate: '',           status: 'Pending' },
  { id: 'INV-2026-005', student: 'Omar Mahmoud Ali',     roll: 'SB-2024-005', grade: 'Grade 12-A', feeType: 'Tuition Fee - Semester 1', amount: 500, paid: 500, balance: 0,   dueDate: '2026-01-15', issueDate: '2026-01-05', paymentDate: '2026-01-10', status: 'Paid' },
];

type Invoice = typeof INVOICES_DATA[0];

const STATUS_STYLES: Record<string, string> = {
  Paid:    'bg-green-500 text-white',
  Partial: 'bg-orange-400 text-white',
  Overdue: 'bg-red-500 text-white',
  Pending: 'bg-cyan-500 text-white',
};

// Payments data
const PAYMENTS_DATA = [
  { receipt: 'RCP-2026-001', student: 'Ahmed Mohamed Hassan', roll: 'SB-2024-001', amount: 500, method: 'Cash',         date: '2026-01-10', collectedBy: 'Admin' },
  { receipt: 'RCP-2026-002', student: 'Fatima Ali Omar',      roll: 'SB-2024-002', amount: 300, method: 'Bank Transfer', date: '2026-01-12', collectedBy: 'Admin' },
  { receipt: 'RCP-2026-003', student: 'Omar Mahmoud Ali',     roll: 'SB-2024-005', amount: 500, method: 'Mobile Money',  date: '2026-01-08', collectedBy: 'Admin' },
];
type Payment = typeof PAYMENTS_DATA[0];


const METHOD_ICONS: Record<string, React.ReactNode> = {
  'Cash':         <Wallet size={13} className="text-gray-400" />,
  'Bank Transfer':<Printer size={13} className="text-gray-400" />,
  'Mobile Money': <CurrencyDollar size={13} className="text-gray-400" />,
};

// Custom dropdown
function CustomSelect({
  placeholder, options, value, onChange,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button variant="plain"
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 transition-colors"
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>{value || placeholder}</span>
        <CaretDown size={15} className="text-gray-400 shrink-0" />
      </Button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
          {options.map((opt) => (
            <Button variant="plain"
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                value === opt ? 'font-medium' : 'text-gray-700'
              }`}
              style={value === opt ? { backgroundColor: '#F49E0B', color: 'white' } : {}}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F49E0B';
                (e.currentTarget as HTMLButtonElement).style.color = 'white';
              }}
              onMouseLeave={e => {
                if (value !== opt) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLButtonElement).style.color = '';
                }
              }}
            >
              {opt}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Stat card
function StatCard({
  label, value, sub, subColor, icon, iconBg,
}: {
  label: string; value: string; sub: string; subColor: string;
  icon: React.ReactNode; iconBg: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>
      </div>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
    </div>
  );
}

// Record Payment Modal
function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const [student, setStudent] = useState('');
  const [invoice, setInvoice] = useState('');
  const [method, setMethod] = useState('');
  const [amount, setAmount] = useState('500');
  const [date, setDate] = useState('06/08/2026');
  const [receipt, setReceipt] = useState('');
  const [notes, setNotes] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div ref={modalRef} className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-1">
          <div>
            <h2 className="text-base font-bold text-gray-900">Record Fee Payment</h2>
            <p className="text-xs text-green-600 mt-0.5">Enter payment details for a student</p>
          </div>
          <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
            <X size={18} />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-3 space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Student</label>
              <CustomSelect placeholder="Choose student" options={STUDENTS} value={student} onChange={setStudent} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Invoice</label>
              <CustomSelect placeholder="Choose invoice" options={INVOICES} value={invoice} onChange={setInvoice} />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Amount ($)</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
              <CustomSelect placeholder="Select method" options={METHODS} value={method} onChange={setMethod} />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Date</label>
              <Input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Receipt Number</label>
              <Input
                type="text"
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
                placeholder="RCP-2026-XXX"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional payment notes..."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <Button variant="plain"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg transition-colors"
              style={{}}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F49E0B';
                (e.currentTarget as HTMLButtonElement).style.color = 'white';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#F49E0B';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
                (e.currentTarget as HTMLButtonElement).style.color = '';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '';
              }}
            >
              Cancel
            </Button>
            <Button variant="plain"
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Check size={15} /> Record Payment & Generate Receipt
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Payment Receipt Modal
function PaymentReceiptModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
  }
  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div ref={modalRef} className="bg-white rounded-2xl w-full max-w-lg" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Payment Receipt</h2>
            <p className="text-xs text-gray-400 mt-0.5">{payment.receipt}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="plain"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-all"
              onMouseEnter={e => { const b = e.currentTarget; b.style.backgroundColor = '#F49E0B'; b.style.color = 'white'; b.style.borderColor = '#F49E0B'; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.backgroundColor = ''; b.style.color = ''; b.style.borderColor = ''; }}
            >
              <Printer size={13} /> Print
            </Button>
            <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Receipt body */}
        <div className="px-6 py-5">
          {/* Buildings name card */}
          <div className="border border-gray-200 rounded-xl p-5 mb-5">
            <div className="text-center border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Sobet School</h3>
              <p className="text-xs text-gray-400 mt-0.5">Fee Payment Receipt</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Receipt Number:</p>
                <p className="text-sm font-bold text-gray-900">{payment.receipt}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Date:</p>
                <p className="text-sm font-bold text-gray-900">{payment.date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Student Name:</p>
                <p className="text-sm font-bold text-gray-900">{payment.student}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Roll Number:</p>
                <p className="text-sm font-bold text-gray-900">{payment.roll}</p>
              </div>
            </div>

            <hr className="my-4 border-gray-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Amount Paid:</span>
              <span className="text-2xl font-bold text-green-600">${payment.amount}</span>
            </div>

            <hr className="my-4 border-gray-100" />

            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Payment Method:</p>
                <p className="text-sm font-bold text-gray-900">{payment.method}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Collected By:</p>
                <p className="text-sm font-bold text-gray-900">{payment.collectedBy}</p>
              </div>
            </div>

            <div className="text-center mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Thank you for your payment</p>
              <p className="text-xs text-gray-300 mt-0.5">This is a computer-generated receipt</p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Invoice Details Modal
function InvoiceDetailsModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
  }
  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div ref={modalRef} className="bg-white rounded-2xl w-full max-w-lg" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Invoice Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">{invoice.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="plain" className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Printer size={13} /> Print
            </Button>
            <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-1">
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Student info grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Student Name:</p>
              <p className="text-sm font-semibold text-gray-900">{invoice.student}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Roll Number:</p>
              <p className="text-sm font-semibold text-gray-900">{invoice.roll}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Class:</p>
              <p className="text-sm font-semibold text-gray-900">{invoice.grade}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Fee Type:</p>
              <p className="text-sm font-semibold text-gray-900">{invoice.feeType}</p>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Amounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 font-medium">Total Amount</span>
              <span className="text-sm font-bold text-gray-900">${invoice.amount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-medium">Amount Paid</span>
              <span className="text-sm font-bold text-green-600">${invoice.paid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-500 font-medium">Balance Due</span>
              <span className="text-sm font-bold text-red-500">${invoice.balance}</span>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Issue Date:</p>
              <p className="text-sm font-semibold text-gray-900">{invoice.issueDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Due Date:</p>
              <p className="text-sm font-semibold text-gray-900">{invoice.dueDate}</p>
            </div>
            {invoice.paymentDate && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Payment Date:</p>
                <p className="text-sm font-semibold text-gray-900">{invoice.paymentDate}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 mb-1">Status:</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[invoice.status]}`}>
                {invoice.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Main Page
export default function FeeManagementPage() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('All Status');
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filteredInvoices = INVOICES_DATA.Funnel(inv => {
    const matchSearch = inv.student.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.id.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchStatus = invoiceStatus === 'All Status' || inv.status === invoiceStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track fees, payments, and financial records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="plain"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F49E0B';
              (e.currentTarget as HTMLButtonElement).style.color = 'white';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#F49E0B';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '';
              (e.currentTarget as HTMLButtonElement).style.color = '';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '';
            }}
          >
            <DownloadSimple size={15} /> Export Report
          </Button>
          <Button variant="plain"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={15} /> Record Payment
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
        {TABS.map((tab) => (
          <Button variant="plain"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'Dashboard' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Fees" value="$2,500" sub="Academic Year 2026"
              subColor="text-gray-400"
              icon={<CurrencyDollar size={20} className="text-green-600" />}
              iconBg="bg-green-50"
            />
            <StatCard
              label="Paid Fees" value="$1,300" sub="↗ +12.5%"
              subColor="text-green-600"
              icon={<CheckCircle size={20} className="text-green-600" />}
              iconBg="bg-green-50"
            />
            <StatCard
              label="Outstanding" value="$1,200" sub="↘ -5.3%"
              subColor="text-red-500"
              icon={<WarningCircle size={20} className="text-red-500" />}
              iconBg="bg-red-50"
            />
            <StatCard
              label="Collection Rate" value="52.0%" sub="↗ +3.2%"
              subColor="text-green-600"
              icon={<TrendUp size={20} className="text-blue-500" />}
              iconBg="bg-blue-50"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                  />
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar dataKey="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Target" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Fee Status Distribution</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <ChartPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                      labelLine={true}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
                  </ChartPie>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    {d.name}: ${d.value.toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly line chart */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Weekly Collection Progress</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone" dataKey="Collected" stroke="#16a34a"
                  strokeWidth={2.5} dot={{ r: 5, fill: '#16a34a' }} activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone" dataKey="Target" stroke="#3b82f6"
                  strokeWidth={2} strokeDasharray="5 4" dot={{ r: 4, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'Invoices' && (
        <div className="space-y-4">
          {/* MagnifyingGlass & Funnel bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by student name or invoice number."
                value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
            <div className="relative" ref={statusRef}>
              <Button variant="plain"
                onClick={() => setStatusOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-gray-300 transition-colors"
              >
                <Funnel size={14} className="text-gray-400" />
                {invoiceStatus}
                <CaretDown size={13} className="text-gray-400" />
              </Button>
              {statusOpen && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                  {['All Status', 'Paid', 'Partial', 'Overdue', 'Pending'].map(s => (
                    <Button variant="plain"
                      key={s}
                      onClick={() => { setInvoiceStatus(s); setStatusOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={invoiceStatus === s ? { backgroundColor: '#F49E0B', color: 'white' } : {}}
                      onMouseEnter={e => { if (invoiceStatus !== s) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F49E0B'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; } }}
                      onMouseLeave={e => { if (invoiceStatus !== s) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; (e.currentTarget as HTMLButtonElement).style.color = ''; } }}
                    >{s}</Button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">All Invoices ({filteredInvoices.length})</h3>
              <span className="text-xs border border-green-200 text-green-700 px-3 py-1 rounded-full">Academic Year 2026</span>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-sm min-w-[860px]">
                <TableHeader>
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Invoice No.</TableHead>
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Student Details</TableHead>
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Fee Type</TableHead>
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Amount</TableHead>
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Paid</TableHead>
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Balance</TableHead>
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Due Date</TableHead>
                    <TableHead className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-gray-500 px-4 py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map(inv => (
                    <TableRow key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{inv.id}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{inv.student}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{inv.roll} • {inv.grade}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{inv.feeType}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">${inv.amount}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">${inv.paid}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-red-500 whitespace-nowrap">${inv.balance}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{inv.dueDate}</TableCell>
                      <TableCell className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[inv.status]}`}>{inv.status}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <Button variant="plain"
                            onClick={() => setSelectedInvoice(inv)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 transition-all"
                            onMouseEnter={e => {
                              const b = e.currentTarget as HTMLButtonElement;
                              b.style.backgroundColor = '#F49E0B';
                              b.style.color = 'white';
                            }}
                            onMouseLeave={e => {
                              const b = e.currentTarget as HTMLButtonElement;
                              b.style.backgroundColor = '';
                              b.style.color = '';
                            }}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button variant="plain" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <Printer size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'Payments' && (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Collected', value: '$1,300', icon: <Wallet size={22} className="text-green-600" />, bg: 'bg-green-50' },
              { label: 'Transactions',    value: '3',      icon: <CurrencyDollar size={22} className="text-blue-500" />,  bg: 'bg-blue-50' },
              { label: 'Pending',         value: '2',      icon: <Clock size={22} className="text-orange-400" />,     bg: 'bg-orange-50' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.bg}`}>{c.icon}</div>
                <div>
                  <p className="text-xs text-gray-400">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Payments table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Recent Payments</h3>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-sm min-w-[700px]">
                <TableHeader>
                  <TableRow className="border-b border-gray-100">
                    {['Receipt No.', 'Student Details', 'Amount', 'Payment Method', 'Date', 'Collected By', 'Actions'].map(h => (
                      <TableHead key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PAYMENTS_DATA.map(p => (
                    <TableRow key={p.receipt} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <TableCell className="px-5 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{p.receipt}</TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{p.student}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.roll}</p>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm font-bold text-green-600 whitespace-nowrap">${p.amount}</TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-sm text-gray-600">
                          {METHOD_ICONS[p.method] ?? <CurrencyDollar size={13} className="text-gray-400" />}
                          {p.method}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{p.date}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{p.collectedBy}</TableCell>
                      <TableCell className="px-5 py-3">
                        <Button variant="plain"
                          onClick={() => setSelectedPayment(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-all whitespace-nowrap"
                          onMouseEnter={e => { const b = e.currentTarget; b.style.backgroundColor = '#F49E0B'; b.style.color = 'white'; b.style.borderColor = '#F49E0B'; }}
                          onMouseLeave={e => { const b = e.currentTarget; b.style.backgroundColor = ''; b.style.color = ''; b.style.borderColor = ''; }}
                        >
                          <Printer size={13} /> View Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Scholarships Tab - Coming Soon */}
      {activeTab === 'Scholarships' && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <CurrencyDollar size={24} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1">Scholarships</h3>
          <p className="text-sm text-gray-400">This section is coming soon.</p>
        </div>
      )}

      {/* Modals */}
      {showModal && <RecordPaymentModal onClose={() => setShowModal(false)} />}
      {selectedInvoice && <InvoiceDetailsModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
      {selectedPayment && <PaymentReceiptModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
    </div>
  );
}
