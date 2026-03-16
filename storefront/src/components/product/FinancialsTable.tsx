import React from 'react';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface FinancialYear {
    year: string;
    revenue: number;
    ebitda: number;
    pat: number;
}

interface FinancialsTableProps {
    data: FinancialYear[];
}

const FinancialsTable: React.FC<FinancialsTableProps> = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Sort by year descending (FY24, FY23, FY22)
    const sortedData = [...data].sort((a, b) => b.year.localeCompare(a.year));

    const formatValue = (val: number) => {
        const isNegative = val < 0;
        const absVal = Math.abs(val);
        return `${isNegative ? '-' : ''}₹${absVal.toLocaleString('en-IN')} Cr`;
    };

    const getGrowth = (current: number, previous: number) => {
        if (!previous || previous === 0) return null;
        const rawGrowth = ((current - previous) / Math.abs(previous)) * 100;
        return rawGrowth.toFixed(1);
    };

    return (
        <div className="mt-16 mb-12 overflow-hidden rounded-[32px] border border-slate-200 bg-[#0F172A] shadow-xl">
            <div className="bg-slate-900 p-8 border-b border-slate-800">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-emerald-500" />
                    Financial Performance
                </h3>
                <p className="text-sm text-slate-400 mt-2 font-medium italic">Consolidated P&L Statement (All values in ₹ Crores)</p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50">
                            <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">Key Metric</th>
                            {sortedData.map((d) => (
                                <th key={d.year} className="px-8 py-5 text-sm font-bold uppercase tracking-wider text-center text-slate-300 border-b border-slate-800 font-mono">
                                    {d.year}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {/* Revenue Row */}
                        <tr className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-8 py-6">
                                <div className="text-slate-100 font-bold text-lg">Total Revenue</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Operating Income</div>
                            </td>
                            {sortedData.map((d, i) => {
                                const prev = sortedData[i + 1];
                                const growth = prev ? getGrowth(d.revenue, prev.revenue) : null;
                                return (
                                    <td key={d.year + "-rev"} className="px-8 py-6 text-center">
                                        <div className="text-white font-bold text-xl font-mono">{formatValue(d.revenue)}</div>
                                        {growth && (
                                            <div className={`text-[10px] font-bold flex items-center justify-center gap-1 mt-2 px-2 py-0.5 rounded-full inline-flex ${parseFloat(growth) >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'}`}>
                                                {parseFloat(growth) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                {Math.abs(parseFloat(growth))}%
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>

                        {/* EBITDA Row */}
                        <tr className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-8 py-6">
                                <div className="text-slate-100 font-bold text-lg">EBITDA</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Operational Profit</div>
                            </td>
                            {sortedData.map((d, i) => {
                                const margin = ((d.ebitda / d.revenue) * 100).toFixed(1);
                                return (
                                    <td key={d.year + "-ebitda"} className="px-8 py-6 text-center">
                                        <div className={`font-bold text-lg font-mono ${d.ebitda >= 0 ? 'text-slate-200' : 'text-rose-300'}`}>
                                            {formatValue(d.ebitda)}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold mt-2 font-mono uppercase tracking-tighter">MARGIN: {margin}%</div>
                                    </td>
                                );
                            })}
                        </tr>

                        {/* PAT Row */}
                        <tr className="hover:bg-slate-800/30 transition-colors group">
                            <td className="px-8 py-6">
                                <div className="text-slate-100 font-bold text-lg">Profit After Tax (PAT)</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Net Earnings</div>
                            </td>
                            {sortedData.map((d) => (
                                <td key={d.year + "-pat"} className="px-8 py-6 text-center">
                                    <div className={`font-bold text-lg font-mono ${d.pat >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {formatValue(d.pat)}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-slate-900 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-[0.2em]">Data Source: Secondary Market Research & Financial Statements</p>
            </div>
        </div>
    );
};

export default FinancialsTable;
