import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import axios from 'axios';

const TithingTaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser) {
        setLoading(false);
        setTasks([]);
        return;
      }
      try {
        setLoading(true);
        // 3. 獲取 token 並透過 axios 呼叫後端 API
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

    fetchTasks();
  }, [currentUser]); // 當 currentUser 改變時 (登入/登出)，重新獲取資料

  const handleAddNewTask = async () => {
    if (!currentUser) {
      alert("請先登入以新增任務。");
      return;
    }
    try {
      // 4. 獲取 token 並透過 axios 呼叫後端 API 來建立新任務
      const token = await currentUser.getIdToken();
      const response = await axios.post('/api/tithe-tasks', {}, { // POST請求可以沒有 body
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const newTask = response.data; // 後端會回傳完整的新任務物件
      navigate(`/tithing/${newTask.id}`);
      
    } catch (err) {
      console.error("Error creating new task:", err);
      setError("建立新任務失敗，請重試。");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">奉獻計算任務列表</h2>
        <button
          onClick={handleAddNewTask}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
        >
          <PlusCircle size={20} />
          新增計算任務
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
                    <td className="py-3 px-4">{task.treasurerUid}</td>
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
                  <td colSpan="4" className="py-6 px-4 text-center text-gray-500">
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
