import TrialBalanceChart from '../features/finance/components/TrialBalanceChart';
import IncomeStatementChart from '../features/finance/components/IncomeStatementChart';
import BalanceSheetChart from '../features/finance/components/BalanceSheetChart';
import ArAgingChart from '../features/finance/components/ArAgingChart';

export default { title: 'Finance/Charts' };

export const TrialBalance = () => <div style={{ width: 800, height: 360 }}><TrialBalanceChart /></div>;
export const IncomeStatement = () => <div style={{ width: 800, height: 360 }}><IncomeStatementChart /></div>;
export const BalanceSheet = () => <div style={{ width: 800, height: 360 }}><BalanceSheetChart /></div>;
export const ArAging = () => <div style={{ width: 800, height: 360 }}><ArAgingChart /></div>;
