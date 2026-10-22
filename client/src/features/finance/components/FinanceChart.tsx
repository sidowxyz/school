import type { ReactNode } from 'react';
import { DownloadSimple, Image, Printer } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface FinanceChartProps {
  id: string;
  title: string;
  children: ReactNode;
  onExportPng: () => void;
  onDownloadSvg: () => void;
  onPrint: () => void;
}

export default function FinanceChart({
  id, title, children, onExportPng, onDownloadSvg, onPrint,
}: FinanceChartProps) {
  return (
    <section id={id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex gap-1">
          <Button variant="plain" type="button" title="Export PNG" onClick={onExportPng} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <Image size={14} />
          </Button>
          <Button variant="plain" type="button" title="Download SVG" onClick={onDownloadSvg} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <DownloadSimple size={14} />
          </Button>
          <Button variant="plain" type="button" title="Print chart" onClick={onPrint} className="rounded p-1 text-gray-500 hover:bg-gray-100">
            <Printer size={14} />
          </Button>
        </div>
      </div>
      <div className="h-72">{children}</div>
    </section>
  );
}
