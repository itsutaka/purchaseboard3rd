import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from './firebaseConfig';

const LoggedDedicationsList = ({ taskId }) => {
  const [dedications, setDedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const dedicationsCollectionRef = collection(firestore, 'tithe', taskId, 'dedications');
    const q = query(dedicationsCollectionRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const dedicationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDedications(dedicationsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error listening to dedications:", err);
      setError("無法即時載入奉獻記錄。");
      setLoading(false);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [taskId]);

  if (loading) {
    return <p className="text-center text-gray-500">正在載入奉獻記錄...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500">{error}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-200">
          <tr>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">奉獻日期</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">奉獻者代號</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">奉獻科目</th>
            <th className="py-3 px-4 text-right text-sm font-semibold text-gray-600">金額</th>
            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">方式</th>
          </tr>
        </thead>
        <tbody>
          {dedications.length > 0 ? (
            dedications.map(item => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{item.dedicationDate}</td>
                <td className="py-3 px-4">{item.dedicatorId}</td>
                <td className="py-3 px-4">{item.dedicationCategory}</td>
                <td className="py-3 px-4 text-right">{item.amount.toLocaleString()}</td>
                <td className="py-3 px-4">{item.method === 'cash' ? '現金' : '支票'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="py-6 px-4 text-center text-gray-500">
                尚未新增任何奉獻記錄。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LoggedDedicationsList;
