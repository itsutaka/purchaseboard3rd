import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, collection, addDoc, serverTimestamp, getDocs, query } from 'firebase/firestore';
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
  const [dedications, setDedications] = useState([]);

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

  // 監聽 dedications 資料變化
  useEffect(() => {
    if (!taskId) return;

    const dedicationsCollectionRef = collection(firestore, 'tithe', taskId, 'dedications');
    const q = query(dedicationsCollectionRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dedicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDedications(dedicationsData);
    }, (err) => {
      console.error("Error fetching dedications:", err);
      // 不設置錯誤狀態，因為這不是關鍵錯誤
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
    return <div className="text-center py-10 text-text-subtle dark:text-dark-text-subtle transition-theme">載入中...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-danger-500 dark:text-danger-dark transition-theme">{error}</div>;
  }

  if (!task) {
    return null;
  }

  const isTaskCompleted = task.status === 'completed';

  return (
    <div className="space-y-8">
      <div className="bg-surface dark:bg-dark-surface shadow-md rounded-lg p-6 transition-theme">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-main dark:text-dark-text-main mb-4 transition-theme">
            任務詳情
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <p className="text-sm text-text-subtle dark:text-dark-text-subtle">任務 ID</p>
                <p className="font-mono text-sm bg-background dark:bg-dark-background p-2 rounded text-text-main dark:text-dark-text-main transition-theme">{task.id}</p>
              </div>
              <div>
                <p className="text-sm text-text-subtle dark:text-dark-text-subtle">計算日期</p>
                <p className="font-semibold text-text-main dark:text-dark-text-main transition-theme">{task.calculationTimestamp?.toDate().toLocaleDateString('zh-TW')}</p>
              </div>
              <div>
                <p className="text-sm text-text-subtle dark:text-dark-text-subtle">狀態</p>
                <p className={`font-semibold ${isTaskCompleted ? 'text-success-600 dark:text-success-dark' : 'text-holy-gold-600 dark:text-dark-accent'} transition-theme`}>
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
                className="bg-success-600 dark:bg-success-dark hover:bg-success-700 dark:hover:bg-success-dark/90 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-theme disabled:bg-graphite-400 dark:disabled:bg-gray-600"
              >
                <CheckCircle size={20} />
                {isCompleting ? '計算中...' : '完成本次計算'}
              </button>
            )}
            {isTaskCompleted && (
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="bg-accent dark:bg-dark-accent hover:bg-holy-gold-600 dark:hover:bg-dark-accent/90 text-white dark:dark-text-main font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-theme disabled:bg-graphite-400 dark:disabled:bg-gray-600"
              >
                <Download size={20} />
                {isExporting ? '匯出中...' : '匯出PDF'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isTaskCompleted && task.summary && (
        <AggregationSummary summary={task.summary} dedications={dedications} />
      )}

      {!isTaskCompleted && (
        <div className="bg-surface dark:bg-dark-surface shadow-md rounded-lg p-6 transition-theme">
          <h3 className="text-xl font-bold text-text-main dark:text-dark-text-main mb-4 transition-theme">新增奉獻記錄</h3>
          <DedicationEntryForm taskId={taskId} onAddDedication={handleAddDedication} />
        </div>
      )}

      <div className="bg-surface dark:bg-dark-surface shadow-md rounded-lg p-6 transition-theme">
        <h3 className="text-xl font-bold text-text-main dark:text-dark-text-main mb-4 transition-theme">已登錄的奉獻</h3>
        <LoggedDedicationsList taskId={taskId} task={task} />
      </div>
    </div>
  );
};

export default TithingTaskDetail;
