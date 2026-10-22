import React from 'react';
import { Printer } from '@phosphor-icons/react';

export default function FinanceChart({ id, title, children, onExportPng, onDownloadSvg, onPrint }: {
  id: string; title: string; children: React.ReactNode;
  onExportPng?: () => void; onDownloadSvg?: () => void; onPrint?: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <div className="flex gap-2">
          {onExportPng && <button onClick={onExportPng} className="text-xs px-2 py-1 border rounded text-gray-600 bg-white">Export PNG</button>}
          {onDownloadSvg && <button onClick={onDownloadSvg} className="text-xs px-2 py-1 border rounded text-gray-600 bg-white">Download SVG</button>}
          {onPrint && <button onClick={onPrint} className="text-xs px-2 py-1 border rounded text-gray-600 bg-white"><Printer size={14} /></button>}
        </div>
      </div>
      <div id={id} style={{ width: '100%', height: 260 }}>
        {children}
      </div>
    </div>
  );
}
