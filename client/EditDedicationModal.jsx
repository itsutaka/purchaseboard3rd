import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebaseConfig';
import CategorySelector from './CategorySelector';

const EditDedicationModal = ({ isOpen, onClose, dedication, taskId }) => {
  const [formData, setFormData] = useState({
    dedicationDate: '',
    dedicatorId: '',
    dedicationCategory: '',
    amount: '',
    method: 'cash',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 當 dedication prop 變動時，填充表單
    if (dedication) {
      setFormData({
        dedicationDate: dedication.dedicationDate || '',
        dedicatorId: dedication.dedicatorId || '',
        dedicationCategory: dedication.dedicationCategory || '',
        amount: dedication.amount || '',
        method: dedication.method || 'cash',
      });
    }
  }, [dedication]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (category) => {
    setFormData(prev => ({ ...prev, dedicationCategory: category }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.dedicationDate || !formData.dedicatorId || !formData.dedicationCategory || !formData.amount) {
      setError('所有欄位都是必填的。');
      return;
    }

    setIsSubmitting(true);
    try {
      const dedicationDocRef = doc(firestore, 'tithe', taskId, 'dedications', dedication.id);

      await updateDoc(dedicationDocRef, {
        ...formData,
        amount: Number(formData.amount), // 確保金額是數字格式
      });

      onClose(); // 成功後關閉 modal
    } catch (err) {
      console.error("Error updating dedication:", err);
      setError('更新失敗，請稍後再試。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-surface dark:bg-dark-surface p-6 rounded-lg shadow-xl w-full max-w-lg transition-theme">
        <h3 className="text-xl font-bold mb-4 text-text-main dark:text-dark-text-main">編輯奉獻記錄</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dedicationDate" className="block text-sm font-medium text-text-subtle dark:text-dark-text-subtle">奉獻日期</label>
            <input
              type="date"
              id="dedicationDate"
              name="dedicationDate"
              value={formData.dedicationDate}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-graphite-300 dark:border-gray-600 rounded-md bg-surface dark:bg-dark-surface text-text-main dark:text-dark-text-main"
              required
            />
          </div>

          <div>
            <label htmlFor="dedicatorId" className="block text-sm font-medium text-text-subtle dark:text-dark-text-subtle">奉獻者代號</label>
            <input
              type="text"
              id="dedicatorId"
              name="dedicatorId"
              value={formData.dedicatorId}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-graphite-300 dark:border-gray-600 rounded-md bg-surface dark:bg-dark-surface text-text-main dark:text-dark-text-main"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-subtle dark:text-dark-text-subtle">奉獻科目</label>
            <CategorySelector
              selectedCategory={formData.dedicationCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-text-subtle dark:text-dark-text-subtle">金額</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-graphite-300 dark:border-gray-600 rounded-md bg-surface dark:bg-dark-surface text-text-main dark:text-dark-text-main"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-subtle dark:text-dark-text-subtle">方式</label>
            <select
              name="method"
              value={formData.method}
              onChange={handleChange}
              className="mt-1 block w-full p-2 border border-graphite-300 dark:border-gray-600 rounded-md bg-surface dark:bg-dark-surface text-text-main dark:text-dark-text-main"
            >
              <option value="cash">現金</option>
              <option value="check">支票</option>
            </select>
          </div>

          {error && <p className="text-sm text-danger-500 dark:text-danger-dark">{error}</p>}

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-graphite-300 dark:bg-gray-600 text-graphite-900 dark:text-dark-text-main rounded-md hover:bg-graphite-400 dark:hover:bg-gray-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-md hover:bg-primary/90 dark:hover:bg-dark-primary/90 disabled:bg-graphite-400"
            >
              {isSubmitting ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditDedicationModal;
