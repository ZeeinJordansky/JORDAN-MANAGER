import React, { useState } from 'react';
import { panelApi } from '../api';
import { Coins, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { formatLargeNumber } from '../utils';

export default function EconomyPage() {
  const [amount, setAmount] = useState('');

  const handleMassAction = async (action: 'give' | 'take') => {
    const num = parseInt(amount);
    if (isNaN(num) || num <= 0) return alert('Введите корректную сумму');
    if (!confirm(`Вы уверены, что хотите ${action === 'give' ? 'выдать' : 'забрать'} $${formatLargeNumber(num)} у ВСЕХ пользователей?`)) return;
    
    try {
      const res = await panelApi.massCurrencyAction(action, num);
      alert(`Успешно! Обновлено профилей: ${res.affectedCount}`);
      setAmount('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Управление экономикой</h2>
        <p className="text-xs text-slate-400">Массовые операции с валютой и настройки рынка (Только Root)</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          Массовая выдача/изъятие валюты
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Сумма (в $)</label>
            <input
              type="number"
              placeholder="Например: 10000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>
          
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => handleMassAction('give')}
              className="flex-1 py-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowUpCircle className="w-5 h-5" />
              Выдать всем
            </button>
            <button
              onClick={() => handleMassAction('take')}
              className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowDownCircle className="w-5 h-5" />
              Забрать у всех
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Внимание! Эта операция применится ко всем пользователям в базе данных бота. Действие необратимо.
          </p>
        </div>
      </div>
    </div>
  );
}
