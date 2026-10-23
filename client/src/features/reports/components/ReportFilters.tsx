import { useEffect, useState } from 'react';

import { academicApi } from '../../academic-structure/api/academicApi';
import type { Class, Section, Subject } from '../../academic-structure/types';
import { financeApi } from '../../finance/api/financeApi';
import type { FeeType, PaymentMethod } from '../../finance/types';
import type { Year } from '../../academic-structure/types';
import type { ReportFilter } from '../types';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

export type FilterValues = Record<string, string | number>;

interface Props {
  filters: ReportFilter[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
}

const refId = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String((value as { _id?: string })._id ?? '');
};

/**
 * Renders whichever controls a report declares. The reference lists are loaded
 * once and shared, so switching between reports doesn't refetch them.
 */
export default function ReportFilters({ filters, values, onChange }: Props) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (!filters.length) return;
    let cancelled = false;

    Promise.allSettled([
      academicApi.getClasses(),
      academicApi.getSections(),
      academicApi.getSubjects(),
      academicApi.getYears(),
      financeApi.getFeeTypes(),
      financeApi.getPaymentMethods(),
    ]).then(([c, sec, sub, y, ft, pm]) => {
      if (cancelled) return;
      if (c.status === 'fulfilled') setClasses(c.value);
      if (sec.status === 'fulfilled') setSections(sec.value);
      if (sub.status === 'fulfilled') setSubjects(sub.value);

      // Finance reference lists — a role without finance access simply gets
      // rejected promises here, leaving those dropdowns empty.
      if (y.status === 'fulfilled') setYears(y.value);
      if (ft.status === 'fulfilled') setFeeTypes(ft.value);
      if (pm.status === 'fulfilled') setPaymentMethods(pm.value);
    });

    return () => {
      cancelled = true;
    };
    // Reference data is the same for every report; load it the first time any
    // report needs a filter at all.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.length > 0]);

  if (filters.length === 0) return null;

  const set = (key: string, value: string | number) => {
    const next = { ...values };
    if (value === '') delete next[key];
    else next[key] = value;
    onChange(next);
  };

  // Sections only make sense within the chosen class.
  const sectionOptions = values.class_id
    ? sections.filter((s) => refId(s.class) === values.class_id)
    : sections;

  const optionsFor = (filter: ReportFilter): { value: string; label: string }[] => {
    switch (filter.type) {
      case 'class':
        return classes.map((c) => ({ value: c._id, label: c.cl_name }));
      case 'section':
        return sectionOptions.map((s) => ({ value: s._id, label: s.name }));
      case 'subject':
        return subjects.map((s) => ({ value: s._id, label: s.sub_name }));
      case 'year':
        return years.map((y) => ({ value: y._id, label: y.y_name }));
      case 'fee-type':
        return feeTypes.map((f) => ({ value: f._id, label: f.fee_name }));
      case 'payment-method':
        return paymentMethods.map((m) => ({ value: m._id, label: m.payment_method_name }));
      case 'select':
        // Options come straight from the server-side filter descriptor.
        return filter.options ?? [];
      default:
        return [];
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <div className="flex flex-wrap gap-4">
        {filters.map((filter) => {
          const value = values[filter.key] ?? '';

          if (filter.type === 'date') {
            return (
              <label key={filter.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground/80">{filter.label}</span>
                <Input
                  type="date"
                  value={String(value)}
                  onChange={(e) => set(filter.key, e.target.value)}
                  className="h-10 rounded-xl bg-muted/40 px-3 text-sm min-w-[150px]"
                />
              </label>
            );
          }

          if (filter.type === 'number') {
            return (
              <label key={filter.key} className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground/80">{filter.label}</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={value === '' ? (filter.default ?? '') : value}
                  onChange={(e) => set(filter.key, e.target.value)}
                  className="h-10 rounded-xl bg-muted/40 px-3 text-sm w-28"
                />
              </label>
            );
          }

          const options = optionsFor(filter);
          return (
            <label key={filter.key} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground/80">{filter.label}</span>
              <NativeSelect
                value={String(value)}
                onChange={(e) => set(filter.key, e.target.value)}
                className="h-10 rounded-xl bg-muted/40 px-3 text-sm min-w-[190px] max-w-[300px]"
              >
                <option value="">
                  {options.length === 0 ? `No ${filter.label.toLowerCase()} available` : `All ${filter.label.toLowerCase()}`}
                </option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
          );
        })}
      </div>
    </div>
  );
}
