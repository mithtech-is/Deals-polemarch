interface FinancialData {
    year: string;
    revenue: number;
    ebitda: number;
    pat: number; // Profit After Tax
    eps: number; // Earnings Per Share
}

interface FinancialTableProps {
    data: FinancialData[];
}

const FinancialTable = ({ data }: FinancialTableProps) => {
    return (
        <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">Particulars (₹ Cr)</th>
                        {data.map((item) => (
                            <th key={item.year} className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">
                                FY {item.year}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    <tr>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 italic">Revenue</td>
                        {data.map((item) => (
                            <td key={item.year} className="px-6 py-4 text-sm font-medium text-slate-900 text-right">
                                {item.revenue.toLocaleString()}
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 italic">EBITDA</td>
                        {data.map((item) => (
                            <td key={item.year} className="px-6 py-4 text-sm font-medium text-slate-900 text-right">
                                {item.ebitda.toLocaleString()}
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 italic">PAT (Profit)</td>
                        {data.map((item) => (
                            <td key={item.year} className={`px-6 py-4 text-sm font-bold text-right ${item.pat >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {item.pat.toLocaleString()}
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <td className="px-6 py-4 text-sm font-bold text-slate-400 italic">EPS (₹)</td>
                        {data.map((item) => (
                            <td key={item.year} className="px-6 py-4 text-sm font-medium text-slate-600 text-right">
                                {item.eps.toFixed(2)}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default FinancialTable;
