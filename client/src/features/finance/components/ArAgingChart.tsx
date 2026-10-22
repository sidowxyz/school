import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import FinanceChart from './FinanceChart';
import { exportSvgToPng as exportSvgToPngUtil, downloadSvg as downloadSvgUtil, printChart as printChartUtil } from '../utils/chartUtils';
import { financeApi } from '../api/financeApi';

export default function ArAgingChart({ onSliceClick }: { onSliceClick?: (key: string) => void }) {
  const [data, setData] = useState<{ label: string; count: number; amount: number }[]>([]);
  useEffect(() => {
    financeApi.getArAgingReport().then(res => setData(Object.values(res.buckets))).catch(() => setData([]));
  }, []);

  return (
    <FinanceChart id="ar-aging-chart" title="AR Aging"
      onExportPng={() => exportSvgToPngUtil('#ar-aging-chart svg', 'ar-aging.png')}
      onDownloadSvg={() => downloadSvgUtil('#ar-aging-chart svg', 'ar-aging.svg')}
      onPrint={() => printChartUtil('#ar-aging-chart')}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="bucket" />
          <YAxis />
          <Tooltip formatter={(v:any) => new Intl.NumberFormat().format(v)} />
          <Bar dataKey="amount" fill="#3B82F6" onClick={(d:any) => onSliceClick?.((d && d.payload && d.payload.bucket) || '')} />
        </BarChart>
      </ResponsiveContainer>
    </FinanceChart>
  );
}
