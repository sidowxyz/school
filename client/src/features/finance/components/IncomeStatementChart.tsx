import { useEffect, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import FinanceChart from './FinanceChart';
import { exportSvgToPng as exportSvgToPngUtil, downloadSvg as downloadSvgUtil, printChart as printChartUtil } from '../utils/chartUtils';
import { financeApi } from '../api/financeApi';

export default function IncomeStatementChart({ onSliceClick }: { onSliceClick?: (key: string) => void }) {
  const [data, setData] = useState<{ month: string; revenue: number; expense: number }[]>([]);
  useEffect(() => {
    financeApi.getIncomeStatement().then(res => {
      const revenue = res.revenues.reduce((total, item) => total + item.balance, 0);
      const expense = res.expenses.reduce((total, item) => total + item.balance, 0);
      setData([{ month: 'Total', revenue, expense }]);
    }).catch(() => setData([]));
  }, []);

  return (
    <FinanceChart id="income-statement-chart" title="Income Statement (monthly)" 
      onExportPng={() => exportSvgToPngUtil('#income-statement-chart svg', 'income-statement.png')}
      onDownloadSvg={() => downloadSvgUtil('#income-statement-chart svg', 'income-statement.svg')}
      onPrint={() => printChartUtil('#income-statement-chart')}
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(v) => new Intl.NumberFormat().format(Number(v))} />
          <Line type="monotone" dataKey="revenue" stroke="#34D399" strokeWidth={2} dot={{ onClick: (e:any) => onSliceClick?.(e?.payload?.month) }} />
          <Line type="monotone" dataKey="expense" stroke="#FB923C" strokeWidth={2} dot={{ onClick: (e:any) => onSliceClick?.(e?.payload?.month) }} />
        </LineChart>
      </ResponsiveContainer>
    </FinanceChart>
  );
}
