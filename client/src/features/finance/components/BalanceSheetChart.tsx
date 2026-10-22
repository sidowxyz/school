import { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import FinanceChart from './FinanceChart';
import { exportSvgToPng as exportSvgToPngUtil, downloadSvg as downloadSvgUtil, printChart as printChartUtil } from '../utils/chartUtils';
import { financeApi } from '../api/financeApi';

export default function BalanceSheetChart({ onSliceClick }: { onSliceClick?: (key: string) => void }) {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  useEffect(() => {
    financeApi.getBalanceSheet().then(res => {
      const series = [
        { name: 'Assets', value: res.totalAssets || 0 },
        { name: 'Liabilities', value: res.totalLiabilities || 0 },
        { name: 'Equity', value: res.totalEquity || 0 },
      ];
      setData(series);
    }).catch(() => setData([]));
  }, []);

  const COLORS = ['#60A5FA', '#F87171', '#A78BFA'];

  return (
    <FinanceChart id="balance-sheet-chart" title="Balance Sheet (Assets vs Liabilities vs Equity)"
      onExportPng={() => exportSvgToPngUtil('#balance-sheet-chart svg', 'balance-sheet.png')}
      onDownloadSvg={() => downloadSvgUtil('#balance-sheet-chart svg', 'balance-sheet.svg')}
      onPrint={() => printChartUtil('#balance-sheet-chart')}
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} innerRadius={50} outerRadius={90} dataKey="value" nameKey="name" label onClick={(d) => onSliceClick?.(d.name || '')}>
            {data.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => new Intl.NumberFormat().format(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
    </FinanceChart>
  );
}
