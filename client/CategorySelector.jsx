// client/CategorySelector.jsx

import React, { useState, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import categories from './acount_catagory.json'; // 引入 JSON 資料

// 遞迴渲染每個分類項目的元件
const CategoryItem = ({ item, onSelect, level = 0, parentName = '' }) => {
  const currentName = parentName ? `${parentName} > ${item.name}` : item.name;

  const handleSelect = () => {
    onSelect(currentName);
  };

  if (!item.children || item.children.length === 0) {
    return (
      <button
        onClick={handleSelect}
        className="w-full text-left px-4 py-2 hover:bg-blue-100 rounded-md transition-colors"
        style={{ paddingLeft: `${1 + level * 1.5}rem` }}
      >
        {item.name}
      </button>
    );
  }

  return (
    <details className="w-full" open>
      <summary 
        className="px-4 py-2 font-semibold cursor-pointer hover:bg-gray-100 rounded-md flex justify-between items-center"
        style={{ paddingLeft: `${1 + level * 1.5}rem` }}
      >
        {item.name}
        <ChevronDown size={16} className="transform transition-transform details-arrow" />
      </summary>
      <div className="pl-2 border-l-2 border-gray-200 ml-4">
        {item.children.map((child, index) => (
          <CategoryItem key={index} item={child} onSelect={onSelect} level={level + 1} parentName={currentName} />
        ))}
      </div>
    </details>
  );
};

// 主要的選擇器元件
const CategorySelector = ({ value, onChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelect = (selectedValue) => {
    onChange(selectedValue);
    setIsModalOpen(false);
  };

  return (
    <>
      <div>
        <label htmlFor="formAccounting" className="block text-sm font-medium text-gray-700 mb-2">
          會計類別 (選填)
        </label>
        <div className="relative">
          <input
            id="formAccounting"
            type="text"
            value={value}
            onClick={() => setIsModalOpen(true)}
            placeholder="點擊選擇會計類別..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
            readOnly
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown size={20} className="text-gray-400" />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="bg-gray-50 p-4 rounded-t-lg flex justify-between items-center border-b">
              <h2 className="text-lg font-semibold">選擇會計類別</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto">
              {categories.map((category, index) => (
                <CategoryItem key={index} item={category} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        details > summary::-webkit-details-marker { display: none; }
        details[open] > summary .details-arrow { transform: rotate(180deg); }
      `}</style>
    </>
  );
};

export default CategorySelector;