import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import axios from 'axios';

// Modal Component
const SelectFinanceStaffModal = ({ isOpen, onClose, staffList, onConfirm, loading }) => {
  const [selectedStaff, setSelectedStaff] = useState('');

  useEffect(() => {
    // 當列表載入後，預設選中第一個
    if (staffList.length > 0) {
      setSelectedStaff(staffList[0].uid);
    }
  }, [staffList]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">選擇財務同工</h3>
        {loading ? (
          <p>載入同工名單中...</p>
        ) : (
          <>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full p-2 border rounded-md mb-6"
            >
              {staffList.length > 0 ? (
                staffList.map(staff => (
                  <option key={staff.uid} value={staff.uid}>
                    {staff.displayName}
                  </option>
                ))
              ) : (
                <option disabled>沒有可用的財務同工</option>
              )}
            </select>
            <div className="flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={() => onConfirm(selectedStaff)}
                disabled={!selectedStaff}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                確認新增
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


const TithingTaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // New states for the modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [financeStaffList, setFinanceStaffList] = useState([]);
  const [isStaffListLoading, setIsStaffListLoading] = useState(false);


  const fetchTasks = async () => {
    if (!currentUser) {
      setLoading(false);
      setTasks([]);
      return;
    }
    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      const response = await axios.get('/api/tithe-tasks', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (Array.isArray(response.data)) {
        setTasks(response.data);
      } else {
        setTasks([]);
        console.error("API response is not an array:", response.data);
        setError("資料格式不正確。");
      }
      
    } catch (err) {
      console.error("Error fetching tithing tasks:", err);
      setError("無法載入奉獻計算任務。請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentUser]);

  const handleAddNewTask = async () => {
    if (!currentUser) {
      alert("請先登入。");
      return;
    }
    
    setIsModalOpen(true);
    setIsStaffListLoading(true);

    try {
      const token = await currentUser.getIdToken();
      const response = await axios.get('/api/finance-staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFinanceStaffList(response.data);
    } catch (err) {
      console.error("Error fetching finance staff:", err);
      setError("無法載入財務同工名單，請重試。");
      setIsModalOpen(false); // 發生錯誤時關閉 modal
    } finally {
      setIsStaffListLoading(false);
    }
  };

  const handleConfirmAddTask = async (financeStaffUid) => {
    if (!financeStaffUid) {
        alert("請選擇一位財務同工。");
        return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await axios.post('/api/tithe-tasks', 
        { financeStaffUid: financeStaffUid }, // 將選擇的 UID 放在 body 中
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const newTask = response.data;
      setIsModalOpen(false);
      navigate(`/tithing/${newTask.id}`);
      
    } catch (err) {
      console.error("Error creating new task:", err);
      setError("建立新任務失敗，請重試。");
      setIsModalOpen(false);
    }
  };


  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <SelectFinanceStaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staffList={financeStaffList}
        onConfirm={handleConfirmAddTask}
        loading={isStaffListLoading}
      />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">任務列表</h2>
        <button
          onClick={handleAddNewTask}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PlusCircle size={20} />
          新增任務
        </button>
      </div>

      {loading && <p className="text-center text-gray-500">載入中...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}
      
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">計算日期</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">司庫</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">財務同工</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">狀態</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <tr key={task.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                    {task.calculationTimestamp && new Date(task.calculationTimestamp).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">{task.treasurerName || task.treasurerEmail || 'N/A'}</td>
                    <td className="py-3 px-4">{task.financeStaffName || task.financeStaffEmail || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        task.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status === 'completed' ? '已完成' : '進行中'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link 
                        to={`/tithing/${task.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        查看詳情
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-6 px-4 text-center text-gray-500">
                    目前沒有任何計算任務。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TithingTaskList;