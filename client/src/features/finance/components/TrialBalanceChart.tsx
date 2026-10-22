import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import FinanceChart from './FinanceChart';
import { exportSvgToPng as exportSvgToPngUtil, downloadSvg as downloadSvgUtil, printChart as printChartUtil } from '../utils/chartUtils';
import { financeApi } from '../api/financeApi';

export default function TrialBalanceChart({ onSliceClick }: { onSliceClick?: (accountCode: string) => void }) {
  const [data, setData] = useState<import('../types').TrialBalanceRow[]>([]);
  useEffect(() => {
    financeApi.getTrialBalance().then(res => setData(res.data.slice(0, 20))).catch(() => setData([]));
  }, []);

  return (
    <FinanceChart id="trial-balance-chart" title="Trial Balance (top 20 accounts)"
      onExportPng={() => exportSvgToPngUtil('#trial-balance-chart svg', 'trial-balance.png')}
      onDownloadSvg={() => downloadSvgUtil('#trial-balance-chart svg', 'trial-balance.svg')}
      onPrint={() => printChartUtil('#trial-balance-chart')}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="accountCode" />
          <YAxis />
          <Tooltip formatter={(v) => new Intl.NumberFormat().format(Number(v))} />
          <Bar dataKey="debitBalance" stackId="a" fill="#60A5FA" onClick={(d) => onSliceClick?.(String(d.accountCode))}>
            {data.map((_, idx) => <Cell key={idx} fill={idx%2 ? '#60A5FA' : '#34D399'} />)}
          </Bar>
          <Bar dataKey="creditBalance" stackId="a" fill="#F87171" />
        </BarChart>
      </ResponsiveContainer>
    </FinanceChart>
  );
}
