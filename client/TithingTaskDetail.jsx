import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firestore } from './firebaseConfig';
import DedicationEntryForm from './DedicationEntryForm';
import LoggedDedicationsList from './LoggedDedicationsList';
import AggregationSummary from './AggregationSummary';
import { generateTithingReport } from './tithingPdfGenerator'; // Corrected import
import { CheckCircle, Download } from 'lucide-react';

const functions = getFunctions();
const completeTithingTask = httpsCallable(functions, 'completeTithingTask');

const TithingTaskDetail = () => {
  const { taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    const taskDocRef = doc(firestore, 'tithe', taskId);
    
    const unsubscribe = onSnapshot(taskDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setTask({ id: docSnap.id, ...docSnap.data() });
        setError(null);
      } else {
        setError("找不到指定的計算任務。");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching task details:", err);
      setError("無法載入任務詳情。");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [taskId]);

  const handleAddDedication = useCallback(async (newDedication) => {
    if (task?.status === 'completed') {
      alert("此任務已完成，無法新增記錄。");
      return;
    }
    try {
      const dedicationsCollectionRef = collection(firestore, 'tithe', taskId, 'dedications');
      await addDoc(dedicationsCollectionRef, {
        ...newDedication,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error adding dedication:", err);
      throw err;
    }
  }, [taskId, task?.status]);

  const handleCompleteTask = async () => {
    if (!window.confirm("確定要完成本次計算嗎？完成后將無法再新增或修改記錄。")) {
      return;
    }
    setIsCompleting(true);
    try {
      await completeTithingTask({ taskId });
    } catch (err) {
      console.error("Error completing task:", err);
      alert(`完成計算時發生錯誤： ${err.message}`);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const dedicationsCollectionRef = collection(firestore, 'tithe', taskId, 'dedications');
      const dedicationsSnapshot = await getDocs(dedicationsCollectionRef);
      const dedications = dedicationsSnapshot.docs.map(doc => doc.data());
      await generateTithingReport(task, dedications); // Corrected function call
    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("匯出 PDF 時發生錯誤。");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10">載入中...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (!task) {
    return null;
  }

  const isTaskCompleted = task.status === 'completed';

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              奉獻計算任務詳情
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <p className="text-sm text-gray-500">任務 ID</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{task.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">計算日期</p>
                <p className="font-semibold">{task.calculationTimestamp?.toDate().toLocaleDateString('zh-TW')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">狀態</p>
                <p className={`font-semibold ${isTaskCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isTaskCompleted ? '已完成' : '進行中'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {!isTaskCompleted && (
              <button
                onClick={handleCompleteTask}
                disabled={isCompleting}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
              >
                <CheckCircle size={20} />
                {isCompleting ? '計算中...' : '完成本次計算'}
              </button>
            )}
            {isTaskCompleted && (
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
              >
                <Download size={20} />
                {isExporting ? '匯出中...' : '匯出 PDF 報告'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isTaskCompleted && task.summary && (
        <AggregationSummary summary={task.summary} />
      )}

      {!isTaskCompleted && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-xl font-bold text-gray-700 mb-4">新增奉獻記錄</h3>
          <DedicationEntryForm taskId={taskId} onAddDedication={handleAddDedication} />
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-700 mb-4">已登錄的奉獻</h3>
        <LoggedDedicationsList taskId={taskId} />
      </div>
    </div>
  );
};

export default TithingTaskDetail;
