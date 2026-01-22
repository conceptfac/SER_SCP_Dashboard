
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange: (date: string) => void;
  language: Language;
  placeholder?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ label, value, onChange, language, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = TRANSLATIONS[language];
  const containerRef = useRef<HTMLDivElement>(null);

  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const years = Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i + 5);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value), 1));
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selected.getTimezoneOffset();
    const formattedDate = new Date(selected.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    onChange(formattedDate);
    setIsOpen(false);
  };

  const formatDateDisplay = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const renderCalendar = () => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 md:h-9"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const isSelected = value === new Date(year, month, d).toISOString().split('T')[0];
      days.push(
        <button
          key={d}
          onClick={() => handleSelectDay(d)}
          className={`h-8 w-8 md:h-9 md:w-9 flex items-center justify-center rounded-lg text-xs md:text-sm transition-all ${
            isSelected 
            ? 'bg-secondary text-white font-bold' 
            : 'hover:bg-secondary/10 text-secondary'
          }`}
        >
          {d}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:border-secondary/30 transition-all"
      >
        <span className={`text-sm ${!value ? 'text-gray-400' : 'text-secondary font-medium'}`}>
          {value ? formatDateDisplay(value) : (placeholder || 'DD/MM/AAAA')}
        </span>
        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 md:w-72 bg-white border border-gray-100 rounded-2xl shadow-2xl p-4 z-[100] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-4 px-1">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full text-secondary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div className="flex items-center gap-2">
              <select 
                value={viewDate.getMonth()} 
                onChange={handleMonthChange}
                className="bg-transparent text-sm font-bold text-secondary outline-none cursor-pointer appearance-none hover:bg-gray-50 rounded px-1 text-center"
              >
                {t.monthsNames.map((m: string, i: number) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select 
                value={viewDate.getFullYear()} 
                onChange={handleYearChange}
                className="bg-transparent text-sm font-bold text-secondary outline-none cursor-pointer appearance-none hover:bg-gray-50 rounded px-1 text-center"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full text-secondary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          
          <div className="grid grid-cols-7 mb-2">
            {t.daysShort.map(day => (
              <div key={day} className="text-[10px] font-bold text-gray-300 text-center uppercase">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
