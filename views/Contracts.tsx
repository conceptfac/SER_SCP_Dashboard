
import React, { useState, useEffect } from 'react';
import { Contract, Language, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import DatePicker from '../components/DatePicker';

interface DividendRow {
  parcela: number | string;
  diasProRata: number;
  valor: number;
  dataPagamento: string;
  tipo: 'Rendimento' | 'Aporte';
}

interface ContractsProps {
  role: UserRole;
  language: Language;
}

const Contracts: React.FC<ContractsProps> = ({ role, language }) => {
  const t = TRANSLATIONS[language];
  const [showModal, setShowModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  
  // Contract Form State
  const [amount, setAmount] = useState<number>(0);
  const [rate, setRate] = useState<number>(1.5);
  const [months, setMonths] = useState<number>(12);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dividendMap, setDividendMap] = useState<DividendRow[]>([]);

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setAmount(Number(value) / 100);
  };

  const handleRateStep = (step: number) => {
    setRate(prev => Math.max(0, parseFloat((prev + step).toFixed(1))));
  };

  // Business Day Helper
  const getNextBusinessDay = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    if (day === 0) d.setDate(d.getDate() + 1); // Sunday to Monday
    else if (day === 6) d.setDate(d.getDate() + 2); // Saturday to Monday
    return d;
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Auto-generate Dividend Map
  useEffect(() => {
    if (amount <= 0) {
      setDividendMap([]);
      return;
    }

    const schedule: DividendRow[] = [];
    const start = new Date(startDate + 'T12:00:00');
    const startDay = start.getDate();
    const monthlyValue = amount * (rate / 100);
    const dailyRate = monthlyValue / 30;

    let daysFirstMonth = (30 - startDay) + 10;
    if (startDay <= 10) daysFirstMonth = 10 - startDay;
    
    const firstPaymentDate = new Date(start.getFullYear(), start.getMonth() + 1, 10);
    schedule.push({
      parcela: 1,
      diasProRata: daysFirstMonth - 30,
      valor: daysFirstMonth * dailyRate,
      dataPagamento: formatDate(getNextBusinessDay(firstPaymentDate)),
      tipo: 'Rendimento'
    });

    for (let i = 2; i <= months; i++) {
      const paymentDate = new Date(firstPaymentDate.getFullYear(), firstPaymentDate.getMonth() + (i - 1), 10);
      schedule.push({
        parcela: i,
        diasProRata: 0,
        valor: monthlyValue,
        dataPagamento: formatDate(getNextBusinessDay(paymentDate)),
        tipo: 'Rendimento'
      });
    }

    const endDate = new Date(start.getFullYear(), start.getMonth() + months, startDay);
    const finalDays = startDay - 10;

    if (finalDays > 0) {
      schedule.push({
        parcela: months + 1,
        diasProRata: finalDays - 30,
        valor: finalDays * dailyRate,
        dataPagamento: formatDate(getNextBusinessDay(endDate)),
        tipo: 'Rendimento'
      });
    }

    schedule.push({
      parcela: finalDays > 0 ? months + 2 : months + 1,
      diasProRata: 0,
      valor: amount,
      dataPagamento: formatDate(getNextBusinessDay(endDate)),
      tipo: 'Aporte'
    });

    setDividendMap(schedule);
  }, [amount, rate, months, startDate]);

  const contracts: Contract[] = [
    { id: '1', number: 'CTR-2024-001', status: 'Vigente', amount: 50000, rate: 1.5, months: 12, startDate: '2024-01-01', endDate: '2025-01-01', clientName: 'Fulano da Silva', executiveName: 'Consultor Master' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-display font-bold text-secondary tracking-tight">{t.contracts}</h2>
        {role !== UserRole.CLIENTE && (
          <button 
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-6 py-2.5 bg-buttons text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {t.createContract}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 font-display">
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.number}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.status}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.amount}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.rate} (%)</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.months}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.startDate}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.client}</th>
              <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contracts.map(contract => (
              <tr key={contract.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-secondary font-normal">{contract.number}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider bg-green-100 text-green-700 border-green-200`}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-primary font-display">{formatCurrency(contract.amount)}</td>
                <td className="px-6 py-4 text-sm font-semibold">{contract.rate}%</td>
                <td className="px-6 py-4 text-sm">{contract.months}m</td>
                <td className="px-6 py-4 text-sm text-gray-400">{contract.startDate}</td>
                <td className="px-6 py-4 text-sm font-medium">{contract.clientName}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-secondary font-bold text-[10px] hover:underline uppercase tracking-widest px-4 py-2 bg-gray-50 rounded-lg">
                    VISUALIZAR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          
          <div className="relative bg-white w-full sm:max-w-5xl h-auto min-h-full sm:min-h-0 sm:max-h-[95vh] sm:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col font-sans overflow-y-auto sm:overflow-hidden">
            
            <div className="p-6 md:p-10 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-display font-bold text-secondary uppercase tracking-tighter">Novo Contrato</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-secondary rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              <div>
                <div className="mb-8 p-6 bg-gray-50 border border-gray-100 rounded-[2rem] shadow-inner">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Pesquisar Cliente pelo Nome (*)</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl outline-none shadow-sm text-sm font-bold text-secondary pr-12 focus:ring-2 focus:ring-primary/20" 
                      placeholder="Busque por nome ou documento..." 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Valor Aporte (*)</label>
                    <input 
                      type="text" 
                      value={formatCurrency(amount)}
                      onChange={handleAmountChange}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none shadow-inner text-sm font-bold text-primary font-display" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Taxa Mensal (%) (*)</label>
                    <div className="flex bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden shadow-inner h-[50px] w-full">
                      <button 
                        type="button"
                        onClick={() => handleRateStep(-0.1)}
                        className="w-12 h-full flex-shrink-0 flex items-center justify-center bg-gray-200 hover:bg-gray-300 transition-colors text-secondary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"/></svg>
                      </button>
                      <input 
                        type="number" 
                        step="0.1"
                        value={rate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) setRate(val);
                          else if (e.target.value === '') setRate(0);
                        }}
                        className="flex-1 min-w-0 h-full bg-transparent outline-none text-center text-sm font-bold text-secondary appearance-none" 
                        style={{ MozAppearance: 'textfield' }}
                      />
                      <button 
                        type="button"
                        onClick={() => handleRateStep(0.1)}
                        className="w-12 h-full flex-shrink-0 flex items-center justify-center bg-gray-200 hover:bg-gray-300 transition-colors text-secondary"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 5v14M5 12h14"/></svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Período (Meses) (*)</label>
                    <select 
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none shadow-inner text-sm font-bold text-secondary appearance-none cursor-pointer"
                    >
                      {[6, 12, 18, 24, 36].map(m => <option key={m} value={m}>{m} Meses</option>)}
                    </select>
                  </div>
                  <DatePicker 
                    label="Data de Início (*)"
                    value={startDate}
                    onChange={setStartDate}
                    language={language}
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Rendimento</p>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">MENSAL</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Dia Pagamento</p>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Todo dia 10</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Segunda Parcela</p>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest leading-tight">Mês subsequente</p>
                  </div>
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 shadow-inner text-center">
                    <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mb-1">Fim do Contrato</p>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                      {(() => {
                        const d = new Date(startDate + 'T12:00:00');
                        d.setMonth(d.getMonth() + months);
                        return d.toLocaleDateString('pt-BR');
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 sm:min-h-[300px]">
                <h4 className="text-sm font-display font-bold text-secondary uppercase tracking-[0.15em] flex items-center gap-3 mb-4">
                  <span className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_10px_rgba(47,84,160,0.4)]"></span>
                  Mapa de Dividendos
                </h4>
                <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm flex-1 flex flex-col">
                  <div className="overflow-x-auto sm:overflow-y-auto flex-1">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-md font-display">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Parcela</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dias Pro Rata</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor Dividendo</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data Pagamento</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {dividendMap.map((row, idx) => (
                          <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${row.tipo === 'Aporte' ? 'bg-primary/5' : ''}`}>
                            <td className="px-6 py-4 text-xs font-bold text-secondary font-display">{row.parcela}</td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${row.diasProRata !== 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                                {row.diasProRata === 0 ? '-' : row.diasProRata}
                              </span>
                            </td>
                            <td className={`px-6 py-4 text-sm font-bold font-display ${row.tipo === 'Aporte' ? 'text-primary' : 'text-secondary'}`}>
                              {formatCurrency(row.valor)}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-bodyText">
                              {new Date(row.dataPagamento + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full border tracking-widest ${row.tipo === 'Aporte' ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' : 'bg-secondary/10 text-secondary border-secondary/20 shadow-sm'}`}>
                                {row.tipo}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-end gap-4 border-t border-gray-100 pt-8 pb-4">
                <button onClick={() => setShowModal(false)} className="px-10 py-3 text-[11px] font-bold text-bodyText hover:text-secondary uppercase tracking-[0.2em] transition-colors">{t.cancel}</button>
                <button className="px-20 py-4 bg-buttons text-white rounded-[1.5rem] font-bold shadow-2xl hover:opacity-95 transform transition-all hover:-translate-y-1 text-xs uppercase tracking-[0.2em] active:scale-95">
                  EFETIVAR CONTRATO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
