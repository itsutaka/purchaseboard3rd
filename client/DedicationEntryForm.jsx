import React, { useState } from 'react';
import { Plus } from 'lucide-react';

const DEDICATION_CATEGORIES = [
  "主日", "十一", "感恩", "宣教", "特別", 
  "專案", "裝潢", "指定", "慈惠", "植堂"
];

const DedicationEntryForm = ({ taskId, onAddDedication }) => {
  const [dedicationDate, setDedicationDate] = useState(new Date().toISOString().split('T')[0]);
  const [dedicatorId, setDedicatorId] = useState('');
  const [dedicationCategory, setDedicationCategory] = useState(DEDICATION_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dedicatorId || !amount) {
      setError("請填寫奉獻者代號和金額。");
      return;
    }
    setError('');
    setIsSubmitting(true);

    const newDedication = {
      dedicationDate,
      dedicatorId,
      dedicationCategory,
      amount: Number(amount),
      method,
    };

    await onAddDedication(newDedication);

    // Reset form for next entry
    setDedicatorId('');
    setAmount('');
    setDedicationCategory(DEDICATION_CATEGORIES[0]);
    setMethod('cash');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Dedication Date */}
        <div className="flex flex-col">
          <label htmlFor="dedicationDate" className="text-sm font-medium text-gray-600 mb-1">奉獻日期</label>
          <input
            id="dedicationDate"
            type="date"
            value={dedicationDate}
            onChange={(e) => setDedicationDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Dedicator ID */}
        <div className="flex flex-col">
          <label htmlFor="dedicatorId" className="text-sm font-medium text-gray-600 mb-1">奉獻者代號</label>
          <input
            id="dedicatorId"
            type="text"
            value={dedicatorId}
            onChange={(e) => setDedicatorId(e.target.value)}
            placeholder="例如：B0001"
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Dedication Category */}
        <div className="flex flex-col">
          <label htmlFor="dedicationCategory" className="text-sm font-medium text-gray-600 mb-1">奉獻科目</label>
          <select
            id="dedicationCategory"
            value={dedicationCategory}
            onChange={(e) => setDedicationCategory(e.target.value)}
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {DEDICATION_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="flex flex-col">
          <label htmlFor="amount" className="text-sm font-medium text-gray-600 mb-1">奉獻數額</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例如：1000"
            className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Method */}
        <div className="flex flex-col justify-center">
           <label className="text-sm font-medium text-gray-600 mb-1">奉獻方式</label>
          <div className="flex items-center space-x-4 pt-2">
            <label className="flex items-center">
              <input type="radio" name="method" value="cash" checked={method === 'cash'} onChange={() => setMethod('cash')} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"/>
              <span className="ml-2 text-sm text-gray-700">現金</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="method" value="cheque" checked={method === 'cheque'} onChange={() => setMethod('cheque')} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"/>
              <span className="ml-2 text-sm text-gray-700">支票</span>
            </label>
          </div>
        </div>
      </div>
      
      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-400"
      >
        <Plus size={20} />
        {isSubmitting ? '新增中...' : '新增此筆'}
      </button>
    </form>
  );
};

export default DedicationEntryForm;
