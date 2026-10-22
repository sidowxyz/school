import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { DownloadSimple, Plus, CurrencyDollar, CheckCircle, WarningCircle, TrendUp, CaretDown, X, Check, Eye, Printer, MagnifyingGlass, Funnel, Clock, Trophy, Percent, Users, Trash, Faders, PencilSimple } from '@phosphor-icons/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ChartPie, Pie, Cell, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

import { financeApi } from '../api/financeApi';
import { studentsApi } from '../../students/api/studentsApi';
import type { Student } from '../../students/types';
import { academicApi } from '../../academic-structure/api/academicApi';
import type { Class } from '../../academic-structure/types';
import GeneralLedger from '../components/GeneralLedger';
import AccountingTab from '../components/AccountingTab';
import type {
  FeeType, FeeStructure, PaymentMethod, StudentInvoice, StudentFee, StudentScholarship,
  FinanceSummary, RefLevel, RefYear,
} from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import StatStrip from '@/components/shared/StatStrip';

const TABS = ['Dashboard', 'Invoices', 'Payments', 'Scholarships', 'Ledger', 'Accounting', 'Setup'];

const SCHOLARSHIP_TYPES = ['Merit Scholarship', 'Financial Aid', 'Sports Scholarship', 'Sibling Discount', 'Staff Child Discount'];

const PIE_COLORS: Record<string, string> = { Paid: '#10b981', Partially_Paid: '#f59e0b', Unpaid: '#3b82f6' };
const STATUS_LABELS: Record<string, string> = { Paid: 'Paid', Partially_Paid: 'Partial', Unpaid: 'Unpaid' };

function studentName(s: { firstName: string; lastName: string } | undefined | null) {
  return s ? `${s.firstName} ${s.lastName}` : '—';
}

function admissionNo(s: { admission_no?: string; admissionNumber?: string } | undefined | null) {
  return s?.admission_no || s?.admissionNumber || '—';
}

function invoiceDisplayStatus(inv: StudentInvoice): 'Paid' | 'Partial' | 'Overdue' | 'Pending' {
  if (inv.status === 'Paid') return 'Paid';
  if (inv.status === 'Partially_Paid') return 'Partial';
  if (inv.dueDate && new Date(inv.dueDate) < new Date()) return 'Overdue';
  return 'Pending';
}

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-green-500 text-white',
  Partial: 'bg-orange-400 text-white',
  Overdue: 'bg-red-500 text-white',
  Pending: 'bg-cyan-500 text-white',
};

// Custom dropdown
function CustomSelect({
  placeholder, options, value, onChange, searchable = false,
}: {
  placeholder: string;
  // `keywords` is extra hidden text an option can be matched against (e.g. a
  // student's phone / parent name / parent phone), so MagnifyingGlass isn't limited to the label.
  options: { label: string; value: string; keywords?: string }[];
  value: string;
  onChange: (v: string) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const selected = options.find((o) => o.value === value);

  const q = query.trim().toLowerCase();
  const shown = searchable && q
    ? options.Funnel((o) => `${o.label} ${o.keywords ?? ''}`.toLowerCase().includes(q))
    : options;

  return (
    <div className="relative" ref={ref}>
      <Button variant="plain"
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white hover:border-gray-300 transition-colors"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>{selected?.label || placeholder}</span>
        <CaretDown size={15} className="text-gray-400 shrink-0" />
      </Button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, phone, or parent…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            {shown.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400">No matches.</p>
            )}
            {shown.map((opt) => (
              <Button variant="plain"
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === opt.value ? 'font-medium' : 'text-gray-700'}`}
                style={value === opt.value ? { backgroundColor: '#F49E0B', color: 'white' } : {}}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F49E0B'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                onMouseLeave={(e) => { if (value !== opt.value) { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; (e.currentTarget as HTMLButtonElement).style.color = ''; } }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat card
function StatCard({
  label, value, sub, subColor, icon,
}: {
  label: string; value: string; sub: string; subColor?: string;
  icon: React.ReactNode; iconBg?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <p className={`text-xs mt-1 ${subColor || 'text-muted-foreground'}`}>{sub}</p>
      </CardContent>
    </Card>
  );
}

function ModalShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn('p-0 overflow-hidden max-h-[90vh]', wide ? 'max-w-2xl' : 'max-w-lg')}>
        <div className="max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create Invoice Modal
// Create Invoice Modal
function CreateInvoiceModal({
  students, feeStructures, onClose, onCreated,
}: {
  students: Student[]; feeStructures: FeeStructure[]; onClose: () => void; onCreated: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [feeStrucId, setFeeStrucId] = useState('');
  const [feeStrucTouched, setFeeStrucTouched] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<StudentInvoice | null>(null);

  // Real-time scholarship preview state
  const [scholarshipPercent, setScholarshipPercent] = useState<number>(0);
  const [scholarshipName, setScholarshipName] = useState<string>('');
  const [checkingScholarship, setCheckingScholarship] = useState<boolean>(false);

  const selectedStructure = feeStructures.find((f) => f._id === feeStrucId);
  const baseAmount = selectedStructure?.amount || 0;
  const calculatedDiscount = Math.round((baseAmount * scholarshipPercent) / 100 * 100) / 100;
  const netAmount = Math.max(0, baseAmount - calculatedDiscount);

  const handleStudentChange = (id: string) => {
    setStudentId(id);
    setFeeStrucTouched(false);
  };

  // Auto-suggest the fee structure matching the student's class/level, but
  // never override a structure the admin picked themselves.
  useEffect(() => {
    if (feeStrucTouched || !studentId) return;
    const student = students.find((s) => s._id === studentId);
    const levelId = student?.classId && typeof student.classId === 'object' ? student.classId.lev_no : undefined;
    if (!levelId) return;
    const match = feeStructures.find((f) => f.lev_no?._id === levelId);
    if (match) setFeeStrucId(match._id);
  }, [studentId, feeStrucTouched, students, feeStructures]);

  // Live scholarship check when student or structure changes
  useEffect(() => {
    if (!studentId) {
      setScholarshipPercent(0);
      setScholarshipName('');
      return;
    }
    let cancelled = false;
    setCheckingScholarship(true);
    financeApi
      .checkStudentScholarship(studentId, baseAmount)
      .then((res) => {
        if (cancelled) return;
        setScholarshipPercent(res?.percent || 0);
        const scholarship = res?.scholarship as { scholar_type_no?: { scholarship_name?: string } } | undefined;
        setScholarshipName(scholarship?.scholar_type_no?.scholarship_name || 'Active Scholarship');
      })
      .catch(() => {
        if (cancelled) return;
        setScholarshipPercent(0);
      })
      .finally(() => {
        if (!cancelled) setCheckingScholarship(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, baseAmount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const invoice = await financeApi.createInvoice({
        student: studentId,
        fee_struc_no: feeStrucId,
        dueDate: dueDate || undefined,
      });
      setCreated(invoice);
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">{created ? 'Invoice Created' : 'Create Invoice'}</h2>
          <p className="text-xs text-green-600 mt-0.5">
            {created ? 'The invoice has been generated.' : 'Bill a student with automated scholarship calculation'}
          </p>
        </div>
        <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5"><X size={18} /></Button>
      </div>

      {created ? (
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700">Invoice <span className="font-semibold">{created.invoice_no}</span> created for ${created.invoice_amount}
            {(created.discount_percentage || 0) > 0 && (
              <span className="text-green-600"> (a {created.discount_percentage}% discount was applied automatically, saving ${created.discount_amount})</span>
            )}.
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="plain" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Student</label>
            <CustomSelect
              placeholder="Choose student"
              value={studentId}
              onChange={handleStudentChange}
              searchable options={students.map((s) => ({ value: s._id, label: `${s.firstName} ${s.lastName} — ${s.admissionNumber}`, keywords: `${s.phoneNumber ?? ''} ${s.parentName ?? ''} ${s.parentPhoneNumber ?? ''}` }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Structure</label>
            <CustomSelect
              placeholder="Choose fee structure"
              value={feeStrucId}
              onChange={(v) => { setFeeStrucId(v); setFeeStrucTouched(true); }}
              options={feeStructures.map((f) => ({ value: f._id, label: `${f.fee_type_no?.fee_name} — ${f.lev_no?.lev_name} (${f.y_no?.y_name}) — $${f.amount}` }))}
            />
            {selectedStructure && !feeStrucTouched && (
              <p className="text-xs text-green-600 mt-1.5">Suggested based on the student's class level — pick a different structure to override.</p>
            )}
          </div>

          {/* Real-time Scholarship & Amount Breakdown */}
          {selectedStructure && (
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-gray-600">
                <span>Base Fee Amount:</span>
                <span className="font-semibold text-gray-900 font-mono">${baseAmount}</span>
              </div>

              {checkingScholarship ? (
                <div className="flex items-center gap-2 text-emerald-700 text-xs">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full" />
                  Checking active scholarships...
                </div>
              ) : scholarshipPercent > 0 ? (
                <div className="flex items-center justify-between text-emerald-700 font-medium">
                  <span className="flex items-center gap-1">
                    <Trophy size={13} /> {scholarshipName} ({scholarshipPercent}%):
                  </span>
                  <span className="font-mono text-emerald-700 font-bold">-${calculatedDiscount}</span>
                </div>
              ) : studentId ? (
                <p className="text-gray-500 italic text-[11px]">No active scholarship assigned to this student.</p>
              ) : null}

              <div className="border-t border-emerald-200/60 pt-2 flex items-center justify-between font-bold text-sm text-emerald-900">
                <span>Estimated Net Amount:</span>
                <span className="font-mono text-emerald-700">${netAmount}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date (optional)</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between pt-1 pb-1">
            <Button variant="plain" type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Cancel</Button>
            <Button variant="plain" type="submit" disabled={submitting || !studentId || !feeStrucId}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
              <Check size={15} /> {submitting ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// Bulk-generates one invoice per student in a class against a single fee
// structure — the "Generate for Class" counterpart to CreateInvoiceModal.
function BulkInvoiceModal({
  classes, feeStructures, onClose, onCreated,
}: {
  classes: Class[]; feeStructures: FeeStructure[]; onClose: () => void; onCreated: () => void;
}) {
  const [classId, setClassId] = useState('');
  const [feeStrucId, setFeeStrucId] = useState('');
  const [feeStrucTouched, setFeeStrucTouched] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ createdCount: number; skippedCount: number } | null>(null);

  const selectedStructure = feeStructures.find((f) => f._id === feeStrucId);

  const handleClassChange = (id: string) => {
    setClassId(id);
    setFeeStrucTouched(false);
  };

  // Auto-suggest the fee structure matching the class's level, same as CreateInvoiceModal.
  useEffect(() => {
    if (feeStrucTouched || !classId) return;
    const cls = classes.find((c) => c._id === classId);
    const levelId = typeof cls?.lev_no === 'object' ? cls.lev_no._id : cls?.lev_no;
    if (!levelId) return;
    const match = feeStructures.find((f) => f.lev_no?._id === levelId);
    if (match) setFeeStrucId(match._id);
  }, [classId, feeStrucTouched, classes, feeStructures]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await financeApi.createBulkInvoices({ class_id: classId, fee_struc_no: feeStrucId, dueDate: dueDate || undefined });
      setResult(res);
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to generate invoices.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">{result ? 'Invoices Generated' : 'Generate Invoices for Class'}</h2>
          <p className="text-xs text-green-600 mt-0.5">{result ? 'Bulk invoice generation finished.' : 'Bill every student in a class against a fee structure'}</p>
        </div>
        <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5"><X size={18} /></Button>
      </div>

      {result ? (
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-700">
            Generated <span className="font-semibold">{result.createdCount}</span> invoice(s).
            {result.skippedCount > 0 && <span className="text-gray-500"> Skipped {result.skippedCount} student(s) already invoiced against this fee structure.</span>}
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="plain" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class</label>
            <CustomSelect
              placeholder="Choose class"
              value={classId}
              onChange={handleClassChange}
              options={classes.map((c) => ({ value: c._id, label: c.cl_name }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Structure</label>
            <CustomSelect
              placeholder="Choose fee structure"
              value={feeStrucId}
              onChange={(v) => { setFeeStrucId(v); setFeeStrucTouched(true); }}
              options={feeStructures.map((f) => ({ value: f._id, label: `${f.fee_type_no?.fee_name} — ${f.lev_no?.lev_name} (${f.y_no?.y_name}) — $${f.amount}` }))}
            />
            {selectedStructure && !feeStrucTouched && (
              <p className="text-xs text-green-600 mt-1.5">Suggested based on the class's level — pick a different structure to override.</p>
            )}
            {selectedStructure && (
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 mt-2 text-xs text-emerald-800 flex items-start gap-2">
                <Trophy size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Automated Scholarship &amp; Sibling Discounts</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Base fee: <span className="font-mono font-semibold text-gray-900">${selectedStructure.amount}</span>. Active scholarships and sibling rules will be dynamically verified and deducted for each student individually.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date (optional)</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between pt-1 pb-1">
            <Button variant="plain" type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Cancel</Button>
            <Button variant="plain" type="submit" disabled={submitting || !classId || !feeStrucId}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
              <Check size={15} /> {submitting ? 'Generating...' : 'Generate Invoices'}
            </Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// Invoice Details Modal (view-only)
function InvoiceDetailsModal({ invoice, onClose, onEdit, onDelete }: {
  invoice: StudentInvoice;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const displayStatus = invoiceDisplayStatus(invoice);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await financeApi.deleteInvoice(invoice._id);
      onDelete();
      onClose();
    } catch { setDeleting(false); setConfirming(false); }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-bold text-gray-900">Invoice Details</h2>
          <p className="text-xs text-gray-400 mt-0.5">{invoice.invoice_no}</p>
        </div>
        <div className="flex items-center gap-2 ml-1">
          <Button variant="plain" onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <PencilSimple size={12} /> Edit
          </Button>
          <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></Button>
        </div>
      </div>
      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div><p className="text-xs text-gray-400 mb-1">Student Name:</p><p className="text-sm font-semibold text-gray-900">{studentName(invoice.student)}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Admission No:</p><p className="text-sm font-semibold text-gray-900">{admissionNo(invoice.student)}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Fee Type:</p><p className="text-sm font-semibold text-gray-900">{invoice.fee_struc_no?.fee_type_no?.fee_name || '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Level / Year:</p><p className="text-sm font-semibold text-gray-900">{invoice.fee_struc_no?.lev_no?.lev_name} ({invoice.fee_struc_no?.y_no?.y_name})</p></div>
        </div>
        <hr className="border-gray-100" />
        <div className="space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm text-gray-700 font-medium">Base Amount</span><span className="text-sm font-bold text-gray-900">${invoice.original_amount ?? invoice.invoice_amount}</span></div>
          {(invoice.discount_percentage || 0) > 0 && (
            <div className="flex items-center justify-between"><span className="text-sm text-orange-500 font-medium">Discount ({invoice.discount_percentage}%)</span><span className="text-sm font-bold text-orange-500">-${invoice.discount_amount}</span></div>
          )}
          <div className="flex items-center justify-between"><span className="text-sm text-gray-700 font-medium">Total Amount</span><span className="text-sm font-bold text-gray-900">${invoice.invoice_amount}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-green-600 font-medium">Amount Paid</span><span className="text-sm font-bold text-green-600">${invoice.paid_amount}</span></div>
          <div className="flex items-center justify-between"><span className="text-sm text-red-500 font-medium">Balance Due</span><span className="text-sm font-bold text-red-500">${invoice.balance}</span></div>
        </div>
        <hr className="border-gray-100" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div><p className="text-xs text-gray-400 mb-1">Issue Date:</p><p className="text-sm font-semibold text-gray-900">{new Date(invoice.registerDate).toLocaleDateString()}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Due Date:</p><p className="text-sm font-semibold text-gray-900">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</p></div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Status:</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[displayStatus]}`}>{displayStatus}</span>
          </div>
        </div>
        {/* Delete zone */}
        {invoice.status !== 'Paid' && (
          <div className="pt-2 border-t border-gray-100">
            {!confirming ? (
              <Button variant="plain" onClick={() => setConfirming(true)} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700">
                <Trash size={13} /> Void / Delete Invoice
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-red-600 font-medium">This cannot be undone. Confirm?</span>
                <Button variant="plain" onClick={handleDelete} disabled={deleting}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </Button>
                <Button variant="plain" onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// Edit Invoice Modal
function EditInvoiceModal({ invoice, onClose, onSaved }: {
  invoice: StudentInvoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dueDate, setDueDate] = useState(invoice.dueDate ? invoice.dueDate.split('T')[0] : '');
  const [status, setStatus] = useState(invoice.status || 'Unpaid');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await financeApi.updateInvoice(invoice._id, {
        dueDate: dueDate || undefined,
        status,
        notes: notes || undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update invoice.');
    } finally {
      setSaving(false);
    }
  }

  const statusOptions = ['Unpaid', 'Partially_Paid', 'Paid'];

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-bold text-gray-900">Edit Invoice</h2>
          <p className="text-xs text-gray-400 mt-0.5">{invoice.invoice_no} · {studentName(invoice.student)}</p>
        </div>
        <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></Button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Read-only summary */}
        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
          <div><span className="text-gray-400">Invoice Amount</span><p className="font-bold text-gray-900 text-sm mt-0.5">${invoice.invoice_amount}</p></div>
          <div><span className="text-gray-400">Balance Due</span><p className="font-bold text-red-500 text-sm mt-0.5">${invoice.balance}</p></div>
          <div><span className="text-gray-400">Amount Paid</span><p className="font-bold text-green-600 text-sm mt-0.5">${invoice.paid_amount}</p></div>
          <div><span className="text-gray-400">Issue Date</span><p className="font-semibold text-gray-700 text-sm mt-0.5">{new Date(invoice.registerDate).toLocaleDateString()}</p></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
          <div className="flex gap-2">
            {statusOptions.map((s) => (
              <Button variant="plain" key={s} type="button" onClick={() => setStatus(s as StudentInvoice['status'])}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  status === s
                    ? s === 'Paid' ? 'bg-green-500 text-white border-green-500'
                      : s === 'Partially_Paid' ? 'bg-orange-400 text-white border-orange-400'
                      : 'bg-cyan-500 text-white border-cyan-500'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {s === 'Partially_Paid' ? 'Partial' : s}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Adjusted due to scholarship update..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          <Button variant="plain" type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Cancel</Button>
          <Button variant="plain" type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            <Check size={15} /> {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

// Edit Payment Modal
function EditPaymentModal({ fee, paymentMethods, onClose, onSaved }: {
  fee: StudentFee;
  paymentMethods: PaymentMethod[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(fee.paid_amount));
  const [methodId, setMethodId] = useState((fee.payment_method_no as any)?._id || '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await financeApi.updateStudentFee(fee._id, {
        paid_amount: Number(amount),
        payment_method_no: methodId || undefined,
        notes: notes || undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update payment.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await financeApi.deleteStudentFee(fee._id);
      onSaved();
      onClose();
    } catch { setDeleting(false); setConfirming(false); }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-bold text-gray-900">Edit Payment</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fee.student_fee_no}</p>
        </div>
        <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></Button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {/* Read-only info */}
        <div className="bg-slate-50 rounded-xl p-4 text-xs grid grid-cols-2 gap-3">
          <div><span className="text-gray-400">Student</span><p className="font-semibold text-gray-900 mt-0.5">{studentName((fee.invoice_no as any)?.student)}</p></div>
          <div><span className="text-gray-400">Date</span><p className="font-semibold text-gray-700 mt-0.5">{fee.registerDate ? new Date(fee.registerDate).toLocaleDateString() : '—'}</p></div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount Paid ($)</label>
          <Input type="number" min={0} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
          <CustomSelect
            placeholder="Select method"
            value={methodId}
            onChange={setMethodId}
            options={paymentMethods.map((m) => ({ value: m._id, label: m.payment_method_name }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Correction reason..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          <Button variant="plain" type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Cancel</Button>
          <Button variant="plain" type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            <Check size={15} /> {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>

        {/* Delete zone */}
        <div className="pt-3 border-t border-gray-100">
          {!confirming ? (
            <Button variant="plain" type="button" onClick={() => setConfirming(true)} className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700">
              <Trash size={13} /> Delete this payment record
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-red-600 font-medium">This will reverse the payment. Confirm?</span>
              <Button variant="plain" type="button" onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </Button>
              <Button variant="plain" type="button" onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</Button>
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}

// Record Payment Modal
function RecordPaymentModal({
  students, invoices, paymentMethods, onClose, onRecorded, onNeedInvoice,
}: {
  students: Student[]; invoices: StudentInvoice[]; paymentMethods: PaymentMethod[]; onClose: () => void; onRecorded: () => void; onNeedInvoice: () => void;
}) {
  const [studentId, setStudentId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState('');
  const [accNo, setAccNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const openInvoices = invoices.Funnel((inv) => inv.student?._id === studentId && inv.status !== 'Paid');
  const selectedInvoice = openInvoices.find((i) => i._id === invoiceId);

  useEffect(() => {
    if (selectedInvoice) setAmount(String(selectedInvoice.balance));
  }, [selectedInvoice]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await financeApi.createStudentFee({ invoice_no: invoiceId, payment_method_no: methodId, paid_amount: Number(amount), acc_no: accNo || undefined });
      setDone(true);
      onRecorded();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">{done ? 'Payment Recorded' : 'Record Fee Payment'}</h2>
          <p className="text-xs text-green-600 mt-0.5">{done ? 'The invoice balance has been updated.' : 'Enter payment details for a student'}</p>
        </div>
        <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"><X size={18} /></Button>
      </div>

      {done ? (
        <div className="px-6 py-5">
          <Button variant="plain" onClick={onClose} className="w-full px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">Done</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-6 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Student</label>
              <CustomSelect placeholder="Choose student" value={studentId}
                onChange={(v) => { setStudentId(v); setInvoiceId(''); }}
                searchable options={students.map((s) => ({ value: s._id, label: `${s.firstName} ${s.lastName} — ${s.admissionNumber}`, keywords: `${s.phoneNumber ?? ''} ${s.parentName ?? ''} ${s.parentPhoneNumber ?? ''}` }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Invoice</label>
              <CustomSelect placeholder={studentId ? (openInvoices.length ? 'Choose invoice' : 'No open invoices') : 'Choose a student first'} value={invoiceId} onChange={setInvoiceId}
                options={openInvoices.map((i) => ({ value: i._id, label: `${i.invoice_no} — Balance $${i.balance}` }))} />
            </div>
          </div>

          {studentId && openInvoices.length === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5 text-xs text-amber-800 flex items-center justify-between gap-2">
              <span>This student has no open invoices to pay against. Create an invoice first.</span>
              <Button variant="plain" type="button" onClick={onNeedInvoice} className="shrink-0 font-semibold text-amber-900 underline hover:no-underline">
                Create invoice
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Amount ($)</label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method</label>
              <CustomSelect placeholder="Select method" value={methodId} onChange={setMethodId}
                options={paymentMethods.map((m) => ({ value: m._id, label: m.payment_method_name }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference / Account No. (optional)</label>
            <Input value={accNo} onChange={(e) => setAccNo(e.target.value)} placeholder="e.g. transaction reference"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center justify-between pt-1 pb-1">
            <Button variant="plain" type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Cancel</Button>
            <Button variant="plain" type="submit" disabled={submitting || !invoiceId || !methodId || !amount}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
              <Check size={15} /> {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// Payment Receipt Modal
function PaymentReceiptModal({ fee, onClose }: { fee: StudentFee; onClose: () => void }) {
  const invoice = fee.invoice_no;
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-base font-bold text-gray-900">Payment Receipt</h2>
          <p className="text-xs text-gray-400 mt-0.5">{fee.student_fee_no}</p>
        </div>
        <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-1"><X size={18} /></Button>
      </div>
      <div className="px-6 py-5">
        <div className="border border-gray-200 rounded-xl p-5 mb-1">
          <div className="text-center border-b border-gray-100 pb-4 mb-4">
            <h3 className="text-lg font-bold text-gray-900">Sobet School</h3>
            <p className="text-xs text-gray-400 mt-0.5">Fee Payment Receipt</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div><p className="text-xs text-gray-400 mb-0.5">Receipt Number:</p><p className="text-sm font-bold text-gray-900">{fee.student_fee_no}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Date:</p><p className="text-sm font-bold text-gray-900">{new Date(fee.registerDate).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Student Name:</p><p className="text-sm font-bold text-gray-900">{studentName(invoice?.student)}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Admission No:</p><p className="text-sm font-bold text-gray-900">{admissionNo(invoice?.student)}</p></div>
          </div>
          <hr className="my-4 border-gray-100" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Amount Paid:</span>
            <span className="text-2xl font-bold text-green-600">${fee.paid_amount}</span>
          </div>
          <hr className="my-4 border-gray-100" />
          <div className="grid grid-cols-2 gap-x-8">
            <div><p className="text-xs text-gray-400 mb-0.5">Payment Method:</p><p className="text-sm font-bold text-gray-900">{fee.payment_method_no?.payment_method_name || '—'}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Invoice:</p><p className="text-sm font-bold text-gray-900">{invoice?.invoice_no || '—'}</p></div>
          </div>
          <div className="text-center mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Thank you for your payment</p>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// Add Scholarship Modal
function AddScholarshipModal({ students, onClose, onGranted }: { students: Student[]; onClose: () => void; onGranted: () => void }) {
  const [studentId, setStudentId] = useState('');
  const [schType, setSchType] = useState('');
  const [discount, setDiscount] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await financeApi.grantScholarship({
        studentId, scholarshipTypeName: schType, discountPercentage: Number(discount),
        validFrom, validTo, reason: reason || undefined,
      });
      onGranted();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to grant scholarship.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between px-6 pt-5 pb-1">
        <div>
          <h2 className="text-base font-bold text-gray-900">Add Scholarship / Discount</h2>
          <p className="text-xs text-green-600 mt-0.5">Grant a scholarship or discount to a student</p>
        </div>
        <Button variant="plain" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"><X size={18} /></Button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Student</label>
          <CustomSelect placeholder="Choose student" value={studentId} onChange={setStudentId}
            searchable options={students.map((s) => ({ value: s._id, label: `${s.firstName} ${s.lastName} — ${s.admissionNumber}`, keywords: `${s.phoneNumber ?? ''} ${s.parentName ?? ''} ${s.parentPhoneNumber ?? ''}` }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Scholarship Type</label>
            <CustomSelect placeholder="Select type" value={schType} onChange={setSchType}
              options={SCHOLARSHIP_TYPES.map((t) => ({ value: t, label: t }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount (%)</label>
            <Input type="number" min="1" max="100" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Enter discount %"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valid From</label>
            <Input type="date" required value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valid To</label>
            <Input type="date" required value={validTo} onChange={(e) => setValidTo(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason / Remarks</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Enter reason for scholarship..." rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 resize-none" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center justify-between pt-1 pb-1">
          <Button variant="plain" type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg">Cancel</Button>
          <Button variant="plain" type="submit" disabled={submitting || !studentId || !schType || !discount || !validFrom || !validTo}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg">
            <Trophy size={15} /> {submitting ? 'Granting...' : 'Grant Scholarship'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

// Setup tab: Fee Types / Fee Structures / Payment Methods
function SetupPanel<T extends { _id: string }>({
  title, items, columns, onDelete, addForm, renderEdit,
}: {
  title: string;
  items: T[];
  columns: { header: string; render: (item: T) => React.ReactNode }[];
  onDelete: (item: T) => void;
  addForm: React.ReactNode;
  // When provided, each row gets an edit button; editing swaps the row for this
  // form. Call `done()` to close the editor (e.g. after a successful FloppyDisk).
  renderEdit?: (item: T, done: () => void) => React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      {addForm}
      <div className="overflow-x-auto mt-3">
        <Table className="w-full text-sm">
          <TableHeader>
            <TableRow className="border-b border-gray-100">
              {columns.map((c) => <TableHead key={c.header} className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">{c.header}</TableHead>)}
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={columns.length + 1} className="text-center py-6 text-gray-400 text-sm">None configured yet.</TableCell></TableRow>
            ) : items.map((item) => (
              editingId === item._id && renderEdit ? (
                <TableRow key={item._id} className="border-b border-gray-50">
                  <TableCell colSpan={columns.length + 1} className="py-2.5">
                    {renderEdit(item, () => setEditingId(null))}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={item._id} className="border-b border-gray-50">
                  {columns.map((c) => <TableCell key={c.header} className="py-2.5 pr-4 text-gray-700">{c.render(item)}</TableCell>)}
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      {renderEdit && (
                        <Button variant="plain" onClick={() => setEditingId(item._id)} className="text-gray-400 hover:text-green-600" title="Edit"><PencilSimple size={14} /></Button>
                      )}
                      <Button variant="plain" onClick={() => onDelete(item)} className="text-gray-400 hover:text-red-500" title="Delete"><Trash size={14} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Inline editor rows used by the Setup panels.
function EditRowActions({ onCancel, saving }: { onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button variant="plain" type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg px-3 py-2">
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button variant="plain" type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-xs font-medium rounded-lg px-2 py-2">Cancel</Button>
    </div>
  );
}

function FeeTypeEditForm({ item, onSaved, onCancel }: { item: FeeType; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(item.fee_name);
  const [saving, setSaving] = useState(false);
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm';
  const FloppyDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await financeApi.updateFeeType(item._id, { fee_name: name }); onSaved(); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={FloppyDisk} className="flex gap-2 items-center">
      <Input required value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} flex-1`} />
      <EditRowActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function PaymentMethodEditForm({ item, onSaved, onCancel }: { item: PaymentMethod; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(item.payment_method_name);
  const [saving, setSaving] = useState(false);
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm';
  const FloppyDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await financeApi.updatePaymentMethod(item._id, { payment_method_name: name }); onSaved(); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={FloppyDisk} className="flex gap-2 items-center">
      <Input required value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} flex-1`} />
      <EditRowActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function FeeStructureEditForm({
  item, feeTypes, levels, years, onSaved, onCancel,
}: {
  item: FeeStructure; feeTypes: FeeType[]; levels: RefLevel[]; years: RefYear[]; onSaved: () => void; onCancel: () => void;
}) {
  const [feeType, setFeeType] = useState(item.fee_type_no?._id ?? '');
  const [level, setLevel] = useState(item.lev_no?._id ?? '');
  const [year, setYear] = useState(item.y_no?._id ?? '');
  const [amount, setAmount] = useState(String(item.amount));
  const [saving, setSaving] = useState(false);
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm';
  const FloppyDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await financeApi.updateFeeStructure(item._id, { fee_type_no: feeType, lev_no: level, y_no: year, amount: Number(amount) });
      onSaved();
    } finally { setSaving(false); }
  };
  return (
    <form onSubmit={FloppyDisk} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
      <NativeSelect value={feeType} onChange={(e) => setFeeType(e.target.value)} className={`${inputCls} bg-white`}>
        {feeTypes.map((f) => <option key={f._id} value={f._id}>{f.fee_name}</option>)}
      </NativeSelect>
      <NativeSelect value={level} onChange={(e) => setLevel(e.target.value)} className={`${inputCls} bg-white`}>
        {levels.map((l) => <option key={l._id} value={l._id}>{l.lev_name}</option>)}
      </NativeSelect>
      <NativeSelect value={year} onChange={(e) => setYear(e.target.value)} className={`${inputCls} bg-white`}>
        {years.map((y) => <option key={y._id} value={y._id}>{y.y_name}</option>)}
      </NativeSelect>
      <Input required type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
      <EditRowActions onCancel={onCancel} saving={saving} />
    </form>
  );
}

function SetupTab({
  feeTypes, feeStructures, paymentMethods, levels, years, onReload,
}: {
  feeTypes: FeeType[]; feeStructures: FeeStructure[]; paymentMethods: PaymentMethod[];
  levels: RefLevel[]; years: RefYear[]; onReload: () => void;
}) {
  const [feeName, setFeeName] = useState('');
  const [structFeeType, setStructFeeType] = useState('');
  const [structLevel, setStructLevel] = useState('');
  const [structYear, setStructYear] = useState('');
  const [structAmount, setStructAmount] = useState('');
  const [methodName, setMethodName] = useState('');
  const [error, setError] = useState('');

  async function addFeeType(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createFeeType({ fee_type_no: `FT-${Date.now()}`, fee_name: feeName });
      setFeeName('');
      onReload();
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to add fee type.'); }
  }

  async function addFeeStructure(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createFeeStructure({
        fee_struc_no: `FS-${Date.now()}`, fee_type_no: structFeeType, lev_no: structLevel, y_no: structYear, amount: Number(structAmount),
      });
      setStructFeeType(''); setStructLevel(''); setStructYear(''); setStructAmount('');
      onReload();
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to add fee structure.'); }
  }

  async function addMethod(e: React.FormEvent) {
    e.preventDefault();
    try {
      await financeApi.createPaymentMethod({ payment_method_no: `PM-${Date.now()}`, payment_method_name: methodName });
      setMethodName('');
      onReload();
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to add payment method.'); }
  }

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <SetupPanel
        title="Fee Types"
        items={feeTypes}
        columns={[{ header: 'Name', render: (f) => f.fee_name }]}
        onDelete={(f) => financeApi.deleteFeeType(f._id).then(onReload)}
        renderEdit={(item, done) => (
          <FeeTypeEditForm item={item} onCancel={done} onSaved={() => { done(); onReload(); }} />
        )}
        addForm={
          <form onSubmit={addFeeType} className="flex gap-2">
            <Input required placeholder="e.g. Tuition Fee" value={feeName} onChange={(e) => setFeeName(e.target.value)} className={`${inputCls} flex-1`} />
            <Button variant="plain" type="submit" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-4 flex items-center gap-1.5"><Plus size={14} /> Add</Button>
          </form>
        }
      />
      <SetupPanel
        title="Fee Structures"
        items={feeStructures}
        columns={[
          { header: 'Fee Type', render: (f) => f.fee_type_no?.fee_name },
          { header: 'Level', render: (f) => f.lev_no?.lev_name },
          { header: 'Year', render: (f) => f.y_no?.y_name },
          { header: 'Amount', render: (f) => `$${f.amount}` },
        ]}
        onDelete={(f) => financeApi.deleteFeeStructure(f._id).then(onReload)}
        renderEdit={(item, done) => (
          <FeeStructureEditForm item={item} feeTypes={feeTypes} levels={levels} years={years} onCancel={done} onSaved={() => { done(); onReload(); }} />
        )}
        addForm={
          <form onSubmit={addFeeStructure} className="grid grid-cols-4 gap-2">
            <NativeSelect required value={structFeeType} onChange={(e) => setStructFeeType(e.target.value)} className={`${inputCls} bg-white`}>
              <option value="" disabled>Fee Type</option>
              {feeTypes.map((f) => <option key={f._id} value={f._id}>{f.fee_name}</option>)}
            </NativeSelect>
            <NativeSelect required value={structLevel} onChange={(e) => setStructLevel(e.target.value)} className={`${inputCls} bg-white`}>
              <option value="" disabled>Level</option>
              {levels.map((l) => <option key={l._id} value={l._id}>{l.lev_name}</option>)}
            </NativeSelect>
            <NativeSelect required value={structYear} onChange={(e) => setStructYear(e.target.value)} className={`${inputCls} bg-white`}>
              <option value="" disabled>Year</option>
              {years.map((y) => <option key={y._id} value={y._id}>{y.y_name}</option>)}
            </NativeSelect>
            <div className="flex gap-2">
              <Input required type="number" min={0} placeholder="Amount" value={structAmount} onChange={(e) => setStructAmount(e.target.value)} className={`${inputCls} flex-1 min-w-0`} />
              <Button variant="plain" type="submit" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-3"><Plus size={14} /></Button>
            </div>
          </form>
        }
      />
      <SetupPanel
        title="Payment Methods"
        items={paymentMethods}
        columns={[{ header: 'Name', render: (m) => m.payment_method_name }]}
        onDelete={(m) => financeApi.deletePaymentMethod(m._id).then(onReload)}
        renderEdit={(item, done) => (
          <PaymentMethodEditForm item={item} onCancel={done} onSaved={() => { done(); onReload(); }} />
        )}
        addForm={
          <form onSubmit={addMethod} className="flex gap-2">
            <Input required placeholder="e.g. Mobile Money" value={methodName} onChange={(e) => setMethodName(e.target.value)} className={`${inputCls} flex-1`} />
            <Button variant="plain" type="submit" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-4 flex items-center gap-1.5"><Plus size={14} /> Add</Button>
          </form>
        }
      />
    </div>
  );
}

// Main Page
export default function FeeManagementPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [levels, setLevels] = useState<RefLevel[]>([]);
  const [years, setYears] = useState<RefYear[]>([]);
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [scholarships, setScholarships] = useState<StudentScholarship[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  const [classes, setClasses] = useState<Class[]>([]);

  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showBulkInvoice, setShowBulkInvoice] = useState(false);
  const [showAddScholarship, setShowAddScholarship] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<StudentInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<StudentInvoice | null>(null);
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [editingFee, setEditingFee] = useState<StudentFee | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('All Status');
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        studentsApi.getAll({ limit: 500 }),
        financeApi.getFeeTypes(),
        financeApi.getFeeStructures(),
        financeApi.getPaymentMethods(),
        financeApi.getLevels(),
        financeApi.getYears(),
        financeApi.getInvoices(),
        financeApi.getStudentFees(),
        financeApi.getStudentScholarships(),
        financeApi.getFinanceSummary(),
        academicApi.getClasses(),
      ]);

      const [
        studentsRes, feeTypesRes, feeStructuresRes, paymentMethodsRes, levelsRes, yearsRes,
        invoicesRes, studentFeesRes, scholarshipsRes, summaryRes, classesRes,
      ] = results;

      if (studentsRes.status === 'fulfilled') setStudents(studentsRes.value.students || []);
      if (feeTypesRes.status === 'fulfilled') setFeeTypes(feeTypesRes.value || []);
      if (feeStructuresRes.status === 'fulfilled') setFeeStructures(feeStructuresRes.value || []);
      if (paymentMethodsRes.status === 'fulfilled') setPaymentMethods(paymentMethodsRes.value || []);
      if (levelsRes.status === 'fulfilled') setLevels(levelsRes.value || []);
      if (yearsRes.status === 'fulfilled') setYears(yearsRes.value || []);
      if (invoicesRes.status === 'fulfilled') setInvoices(invoicesRes.value || []);
      if (studentFeesRes.status === 'fulfilled') setStudentFees(studentFeesRes.value || []);
      if (scholarshipsRes.status === 'fulfilled') setScholarships(scholarshipsRes.value || []);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value || null);
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value || []);

      // If every single one failed, report connection issue
      const allFailed = results.every(r => r.status === 'rejected');
      if (allFailed) {
        setLoadError('Cannot connect to backend server. Please verify backend is running on port 5000.');
      } else {
        setLoadError('');
      }
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || 'Failed to load finance data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if ((location.state as { openRecordPayment?: boolean } | null)?.openRecordPayment) {
      setShowRecordPayment(true);
    }
  }, [location.state]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filteredInvoices = invoices.Funnel((inv) => {
    const matchSearch = studentName(inv.student).toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.invoice_no.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchStatus = invoiceStatus === 'All Status' || invoiceDisplayStatus(inv) === invoiceStatus;
    return matchSearch && matchStatus;
  });

  const activeScholarships = scholarships.Funnel((s) => s.status_no?.st_name === 'Active');
  const avgDiscount = activeScholarships.length
    ? Math.round(activeScholarships.reduce((s, sc) => s + (sc.scholarship_id?.discount_value || 0), 0) / activeScholarships.length)
    : 0;

  const paymentsStats = {
    totalCollected: studentFees.reduce((s, f) => s + f.paid_amount, 0),
    transactions: studentFees.length,
    pending: invoices.Funnel((i) => i.status !== 'Paid').length,
  };

  if (loading) return <div className="text-center py-24 text-gray-500 font-medium animate-pulse">Loading finance data...</div>;
  if (loadError && invoices.length === 0 && feeTypes.length === 0) {
    return (
      <div className="text-center py-24 space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <WarningCircle size={24} />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Unable to Load Finance Records</h3>
        <p className="text-sm text-gray-500">{loadError}</p>
        <Button variant="plain" onClick={loadAll} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm">
          Retry Connection
        </Button>
      </div>
    );
  }

  const handleExportReport = () => {
    const csvRows = [
      ['Invoice #', 'Student Name', 'Admission #', 'Fee Structure', 'Original Amount ($)', 'Discount ($)', 'Net Amount ($)', 'Paid ($)', 'Balance ($)', 'Status', 'Due Date'],
      ...invoices.map((inv) => [
        inv.invoice_no,
        studentName(inv.student),
        admissionNo(inv.student),
        inv.fee_struc_no?.fee_type_no?.fee_name || 'Fee',
        inv.original_amount || inv.invoice_amount,
        inv.discount_amount || 0,
        inv.invoice_amount,
        inv.paid_amount,
        inv.balance,
        inv.status,
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—',
      ]),
    ];

    const csvContent = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Finance & Fees"
        subtitle="Track student tuition fees, invoices, payments, scholarships, and accounting ledger."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportReport} className="gap-2">
              <DownloadSimple size={14} />
              <span className="hidden sm:inline">Export Report</span>
            </Button>
            <Button size="sm" onClick={() => setShowRecordPayment(true)} className="gap-2">
              <Plus size={15} />
              Record Payment
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 border border-border bg-card p-1.5 shadow-sm rounded-xl">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs data-[state=active]:hover:bg-primary whitespace-nowrap"
            >
              {tab === 'Setup' ? (
                <span className="flex items-center gap-1.5"><Faders size={14} /> Setup</span>
              ) : tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Dashboard Tab */}
      {activeTab === 'Dashboard' && summary && (
        <div className="space-y-6">
          <StatStrip
            items={[
              {
                label: 'Total Fees',
                value: `$${summary.totals.totalFees.toLocaleString()}`,
                tone: 'sky',
                icon: CurrencyDollar,
                hint: 'All generated tuition invoices',
              },
              {
                label: 'Paid Fees',
                value: `$${summary.totals.paidFees.toLocaleString()}`,
                tone: 'emerald',
                icon: CheckCircle,
                hint: `${summary.totals.collectionRate}% collected to date`,
              },
              {
                label: 'Outstanding',
                value: `$${summary.totals.outstanding.toLocaleString()}`,
                tone: summary.totals.outstanding > 0 ? 'rose' : 'emerald',
                icon: WarningCircle,
                hint: summary.totals.outstanding > 0 ? 'Balance still owed' : 'All accounts settled',
              },
              {
                label: 'Collection Rate',
                value: `${summary.totals.collectionRate}%`,
                tone: 'violet',
                icon: TrendUp,
                hint: 'Collected vs. billed ratio',
              },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Monthly Collection</CardTitle>
                <CardDescription className="text-xs">Tuition fee collection over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.monthlyCollection.length === 0 ? (
                  <div className="py-16 text-center text-xs text-muted-foreground">
                    No payment collections recorded yet.
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.monthlyCollection} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: 'hsl(var(--popover-foreground))',
                          }}
                          formatter={(v: number) => [`$${v.toLocaleString()}`, 'Collected']}
                        />
                        <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} barSize={26} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Fee Status Distribution</CardTitle>
                <CardDescription className="text-xs">Breakdown of student invoices by payment status</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.statusDistribution.length === 0 ? (
                  <div className="py-16 text-center text-xs text-muted-foreground">
                    No student invoices created yet.
                  </div>
                ) : (
                  <>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <ChartPie>
                          <Pie
                            data={summary.statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            label={({ name, percent }) => `${STATUS_LABELS[name] || name} (${Math.round(percent * 100)}%)`}
                            labelLine={false}
                          >
                            {summary.statusDistribution.map((entry, i) => (
                              <Cell key={i} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                              color: 'hsl(var(--popover-foreground))',
                            }}
                            formatter={(v: number) => [`$${v.toLocaleString()}`, 'Total']}
                          />
                        </ChartPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-border/50 text-center">
                      {summary.statusDistribution.map((d) => (
                        <div key={d.name} className="flex flex-col items-center gap-0.5">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[d.name] || '#94a3b8' }} />
                            {STATUS_LABELS[d.name] || d.name}
                          </span>
                          <span className="font-mono text-xs font-semibold text-foreground">
                            ${d.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Weekly Collection</CardTitle>
              <CardDescription className="text-xs">Tuition cash flow tracking over the last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.weeklyCollection.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No weekly collections recorded yet.
                </div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary.weeklyCollection}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: 'hsl(var(--popover-foreground))',
                        }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, 'Collected']}
                      />
                      <Line
                        type="monotone"
                        dataKey="collected"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#10b981' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'Invoices' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input type="text" placeholder="Search by student name or invoice number." value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500" />
            </div>
            <div className="relative" ref={statusRef}>
              <Button variant="plain" onClick={() => setStatusOpen((o) => !o)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-gray-300 transition-colors">
                <Funnel size={14} className="text-gray-400" /> {invoiceStatus} <CaretDown size={13} className="text-gray-400" />
              </Button>
              {statusOpen && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                  {['All Status', 'Paid', 'Partial', 'Overdue', 'Pending'].map((s) => (
                    <Button variant="plain" key={s} onClick={() => { setInvoiceStatus(s); setStatusOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                      style={invoiceStatus === s ? { backgroundColor: '#F49E0B', color: 'white' } : {}}>
                      {s}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1" />
            <Button variant="plain" onClick={() => setShowBulkInvoice(true)} className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold">
              <Users size={14} /> Generate for Class
            </Button>
            <Button variant="plain" onClick={() => setShowCreateInvoice(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              <Plus size={14} /> Create Invoice
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">All Invoices ({filteredInvoices.length})</h3>
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
                  {filteredInvoices.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-10 text-gray-400 text-sm">No invoices found.</TableCell></TableRow>
                  ) : filteredInvoices.map((inv) => (
                    <TableRow key={inv._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 whitespace-nowrap">{inv.invoice_no}</TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{studentName(inv.student)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{admissionNo(inv.student)}</p>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{inv.fee_struc_no?.fee_type_no?.fee_name || '—'}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-gray-800 whitespace-nowrap">
                        ${inv.invoice_amount}
                        {(inv.discount_percentage || 0) > 0 && <span className="text-orange-500 text-xs ml-1">(-{inv.discount_percentage}%)</span>}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-green-600 whitespace-nowrap">${inv.paid_amount}</TableCell>
                      <TableCell className="px-4 py-3 text-sm font-semibold text-red-500 whitespace-nowrap">${inv.balance}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell className="px-4 py-3"><span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[invoiceDisplayStatus(inv)]}`}>{invoiceDisplayStatus(inv)}</span></TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="plain"
                            onClick={() => setSelectedInvoice(inv)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-slate-100 hover:text-gray-700 transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye size={15} />
                          </Button>
                          <Button variant="plain"
                            onClick={() => setEditingInvoice(inv)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="Edit Invoice"
                          >
                            <PencilSimple size={14} />
                          </Button>
                          {inv.status !== 'Paid' && (
                            <Button variant="plain"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to void/delete invoice ${inv.invoice_no}?`)) {
                                  await financeApi.deleteInvoice(inv._id);
                                  loadAll();
                                }
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete Invoice"
                            >
                              <Trash size={14} />
                            </Button>
                          )}
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
          {/* Stats Row */}
          <StatStrip
            items={[
              {
                label: 'Total Collected',
                value: `$${paymentsStats.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                tone: 'emerald',
                icon: CurrencyDollar,
                hint: 'Net fee revenue received',
              },
              {
                label: 'Transactions',
                value: paymentsStats.transactions,
                tone: 'sky',
                icon: TrendUp,
                hint: 'Completed payment vouchers',
              },
              {
                label: 'Open Invoices',
                value: paymentsStats.pending,
                tone: 'amber',
                icon: Clock,
                hint: 'Unsettled or pending fee dues',
              },
            ]}
          />

          {/* Recent Payments Table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">All Payments ({studentFees.length})</h3>
              <Button variant="plain"
                onClick={() => setShowRecordPayment(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg"
              >
                <Plus size={13} /> Record Payment
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-sm min-w-[700px]">
                <TableHeader>
                  <TableRow className="border-b border-gray-100 bg-slate-50">
                    {['Receipt No.', 'Student Details', 'Amount Paid', 'Payment Method', 'Date', 'Actions'].map((h) => (
                      <TableHead key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentFees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                        No payments recorded yet. Click &quot;Record Payment&quot; to get started.
                      </TableCell>
                    </TableRow>
                  ) : studentFees.slice().reverse().map((fee) => (
                    <TableRow key={fee._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <TableCell className="px-5 py-3 text-sm font-mono font-medium text-gray-800 whitespace-nowrap">
                        {fee.student_fee_no}
                      </TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{studentName((fee.invoice_no as any)?.student)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{admissionNo((fee.invoice_no as any)?.student)}</p>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm font-bold text-green-600 whitespace-nowrap">
                        ${(fee.paid_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-full text-xs font-medium">
                          {(fee.payment_method_no as any)?.payment_method_name || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {fee.registerDate ? new Date(fee.registerDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="px-5 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Button variant="plain"
                            onClick={() => setSelectedFee(fee)}
                            className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                            title="View Receipt"
                          >
                            <Printer size={13} /> Receipt
                          </Button>
                          <Button variant="plain"
                            onClick={() => setEditingFee(fee)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 border border-gray-200"
                            title="Edit Payment"
                          >
                            <PencilSimple size={13} />
                          </Button>
                          <Button variant="plain"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete payment ${fee.student_fee_no}?`)) {
                                await financeApi.deleteStudentFee(fee._id);
                                loadAll();
                              }
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 border border-gray-200"
                            title="Delete Payment"
                          >
                            <Trash size={13} />
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

      {/* Scholarships Tab */}
      {activeTab === 'Scholarships' && (
        <div className="space-y-5">
          <StatStrip
            items={[
              {
                label: 'Active Scholarships',
                value: activeScholarships.length,
                tone: 'emerald',
                icon: Trophy,
                hint: 'Active approved student discounts',
              },
              {
                label: 'Average Discount',
                value: `${avgDiscount}%`,
                tone: 'amber',
                icon: Percent,
                hint: 'Mean approved scholarship waiver',
              },
              {
                label: 'Beneficiaries',
                value: scholarships.length,
                tone: 'sky',
                icon: Users,
                hint: 'Total student recipient profiles',
              },
            ]}
          />

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Scholarships &amp; Discounts</h3>
              <Button variant="plain" onClick={() => setShowAddScholarship(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg">
                <Plus size={14} /> Add Scholarship
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table className="w-full text-sm min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-b border-gray-100">
                    {['Student', 'Class', 'Scholarship Type', 'Discount', 'Valid Period', 'Status', 'Actions'].map((h) => (
                      <TableHead key={h} className="text-left text-xs font-semibold text-gray-500 px-5 py-3">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scholarships.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400 text-sm">No scholarships granted yet.</TableCell></TableRow>
                  ) : scholarships.map((s) => (
                    <TableRow key={s._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <TableCell className="px-5 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-gray-900">{studentName(s.st_no)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.st_no?.admissionNumber}</p>
                      </TableCell>
                      <TableCell className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{s.st_no?.classId?.cl_name || '—'}</TableCell>
                      <TableCell className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{s.scholarship_id?.scholar_type_no?.scholarship_name || '—'}</TableCell>
                      <TableCell className="px-5 py-3 text-sm font-semibold text-orange-500 whitespace-nowrap">{s.scholarship_id?.discount_value ?? 0}%</TableCell>
                      <TableCell className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}</TableCell>
                      <TableCell className="px-5 py-3"><span className={`px-3 py-1 text-xs font-semibold rounded-full ${s.status_no?.st_name === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status_no?.st_name || '—'}</span></TableCell>
                      <TableCell className="px-5 py-3">
                        <Button variant="plain" onClick={() => financeApi.revokeScholarship(s._id).then(loadAll)} className="text-gray-400 hover:text-red-500 text-xs font-medium">Revoke</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* General Ledger Tab */}
      {activeTab === 'Ledger' && (
        <GeneralLedger />
      )}

      {/* Accounting Tab — COA, Fiscal Years, Journal Entries, Trial Balance */}
      {activeTab === 'Accounting' && (
        <AccountingTab />
      )}

      {/* Setup Tab */}
      {activeTab === 'Setup' && (
        <SetupTab feeTypes={feeTypes} feeStructures={feeStructures} paymentMethods={paymentMethods} levels={levels} years={years} onReload={loadAll} />
      )}

      {/* Modals */}
      {showRecordPayment && (
        <RecordPaymentModal students={students} invoices={invoices} paymentMethods={paymentMethods}
          onClose={() => setShowRecordPayment(false)} onRecorded={loadAll}
          onNeedInvoice={() => { setShowRecordPayment(false); setShowCreateInvoice(true); }} />
      )}
      {showCreateInvoice && (
        <CreateInvoiceModal students={students} feeStructures={feeStructures} onClose={() => setShowCreateInvoice(false)} onCreated={loadAll} />
      )}
      {showBulkInvoice && (
        <BulkInvoiceModal classes={classes} feeStructures={feeStructures} onClose={() => setShowBulkInvoice(false)} onCreated={loadAll} />
      )}
      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onEdit={() => {
            const inv = selectedInvoice;
            setSelectedInvoice(null);
            setEditingInvoice(inv);
          }}
          onDelete={loadAll}
        />
      )}
      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={loadAll}
        />
      )}
      {selectedFee && <PaymentReceiptModal fee={selectedFee} onClose={() => setSelectedFee(null)} />}
      {editingFee && (
        <EditPaymentModal
          fee={editingFee}
          paymentMethods={paymentMethods}
          onClose={() => setEditingFee(null)}
          onSaved={loadAll}
        />
      )}
      {showAddScholarship && <AddScholarshipModal students={students} onClose={() => setShowAddScholarship(false)} onGranted={loadAll} />}
    </div>
  );
}
