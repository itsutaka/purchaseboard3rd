import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, MessageCircle, Edit, Trash2, X, Send, Calendar, User, RotateCcw, Receipt, DollarSign, Tag, Download, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { collection, query, onSnapshot } from "firebase/firestore"; // ✨ 新增
import { firestore } from './firebaseConfig'; // ✨ 新增

// Simple Spinner Icon Component
const SpinnerIcon = ({ className = "" }) => <Loader2 size={16} className={`animate-spin ${className}`} />;

const PurchaseRequestBoard = () => {
  const commenterNameInputRef = useRef(null);
  const { currentUser } = useAuth();

  const [requests, setRequests] = useState([]);
  const [purchaseRecords, setPurchaseRecords] = useState([]);

  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [isDeletingRequest, setIsDeletingRequest] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);

  const [newStatusForUpdate, setNewStatusForUpdate] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaserNameInput, setPurchaserNameInput] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [newComment, setNewComment] = useState('');
  const [commenterName, setCommenterName] = useState('');

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [currentRequestForComment, setCurrentRequestForComment] = useState(null);

  const [filterPurchaserName, setFilterPurchaserName] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requester: '',
    accountingCategory: ''
  });

  const statusLabels = {
    'pending': { text: '待購買', color: 'bg-yellow-100 text-yellow-800' },
    'purchased': { text: '已購買', color: 'bg-green-100 text-green-800' }
  };

  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    setFetchError(null);
    try {
      const response = await axios.get('/api/requirements');
      if (Array.isArray(response.data)) {
        setRequests(response.data);
        const purchased = response.data.filter(req => req.status === 'purchased');
        setPurchaseRecords(purchased.map(p => ({
          id: p.id,
          title: p.title || p.text,
          requester: p.requesterName || p.requester,
          purchaseAmount: p.purchaseAmount,
          requestDate: p.createdAt,
          purchaseDate: p.purchaseDate,
          purchaserName: p.purchaserName,
          accountingCategory: p.accountingCategory
        })));
      } else {
        console.error('API response for /api/requirements is not an array:', response.data);
        setFetchError('無法獲取採購請求：資料格式不正確。');
        setRequests([]);
        setPurchaseRecords([]);
      }
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
      setFetchError('無法載入採購請求。 ' + (error.response?.data?.message || error.message));
      setRequests([]);
      setPurchaseRecords([]);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    // 初始載入時先顯示 Loading
    setIsLoadingRequests(true);

    // 建立一個查詢來監聽 'requirements' 集合
    const q = query(collection(firestore, "requirements"));

    // 設定 onSnapshot 監聽器
    const unsubscribe = onSnapshot(q, 
        (snapshot) => {
            // 每當集合有任何變化 (新增、修改、刪除)，這個回呼函式就會被觸發
            console.log("Firestore listener: Detected change in requirements, re-fetching data...");
            // 重新執行我們原有的 API 請求函式來獲取最新且經過後端處理的資料
            fetchRequests();
        },
        (error) => {
            // 處理監聽時發生的錯誤
            console.error("Real-time listener failed: ", error);
            setFetchError("無法建立即時連線，資料可能不會自動更新。");
            setIsLoadingRequests(false);
        }
    );

    // Cleanup: 當元件被卸載時，取消監聽以避免記憶體洩漏
    return () => unsubscribe();
}, [fetchRequests]); // 依賴 fetchRequests (它被 useCallback 包裹，是安全的)

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('請填寫需求標題與詳細描述。');
      return;
    }
    if (!currentUser) {
      setSubmitError("您必須登入才能提交採購需求。");
      alert("您必須登入才能提交採購需求。");
      return;
    }
    setIsSubmittingRequest(true);
    setSubmitError(null);
    try {
      const token = await currentUser.getIdToken();
      const payload = {
        text: formData.title.trim(),
        description: formData.description.trim(),
        accountingCategory: formData.accountingCategory.trim(),
      };
      await axios.post('/api/requirements', payload, { headers: { 'Authorization': `Bearer ${token}` } });
      setFormData({ title: '', description: '', requester: currentUser?.displayName || '', accountingCategory: '' });
      setShowModal(false);
      await fetchRequests();
    } catch (error) {
      console.error("Error submitting request:", error);
      setSubmitError(error.response?.data?.message || error.message || '無法提交採購需求，請再試一次。');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    setSelectedRequestId(id);
    setNewStatusForUpdate(newStatus);
    if (newStatus === 'purchased') {
      setUpdateError(null); // Clear previous error before showing new modal
      setPurchaseAmount(''); // Clear previous amount
      setPurchaserNameInput(currentUser?.displayName || ''); // Pre-fill purchaser name
      setShowPurchaseModal(true);
    } else { // Reverting to 'pending'
      const confirmed = window.confirm("您確定要撤銷這次的購買紀錄嗎？相關的購買金額與日期將會被清除。");

      if (confirmed) { //將原本的所有邏輯都移到 confirmed 判斷式內部
        if (!currentUser) {
          alert("請登入以更新狀態。");
          setUpdateError("請登入以更新狀態。");
          setSelectedRequestId(null); // 清理狀態
          setNewStatusForUpdate(null);  // 清理狀態
        return;
       }
       setIsUpdatingRequest(true);
       setUpdateError(null);
       try {
        const token = await currentUser.getIdToken();
        const payload = {
          status: 'pending',
          purchaseAmount: null,
          purchaseDate: null,
          purchaserName: null,
          purchaserId: null // 同時清除購買者ID
        };
        await axios.put(`/api/requirements/${id}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
        await fetchRequests();
      } catch (error) {
        console.error("Error reverting status:", error);
        setUpdateError(error.response?.data?.message || '無法還原狀態，請再試一次。');
      } finally {
        setIsUpdatingRequest(false);
        setSelectedRequestId(null);
        setNewStatusForUpdate(null);
      }
    } else {
      setSelectedRequestId(null);
      setNewStatusForUpdate(null);
    }
  }
};
  const confirmPurchase = async () => {
    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) { alert('請輸入有效的購買金額'); return; }
    if (!purchaserNameInput.trim()) { alert('請輸入購買人姓名'); return; }
    if (!currentUser) { alert("請登入以確認購買。"); setUpdateError("請登入以確認購買。"); return; }

    setIsUpdatingRequest(true);
    setUpdateError(null);
    try {
      const token = await currentUser.getIdToken();
      const payload = {
        status: 'purchased',
        purchaseAmount: parseFloat(purchaseAmount),
        purchaseDate: new Date().toISOString(),
        purchaserName: purchaserNameInput.trim(),
        purchaserId: currentUser.uid
      };
      await axios.put(`/api/requirements/${selectedRequestId}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
      setPurchaseAmount('');
      setPurchaserNameInput('');
      setShowPurchaseModal(false);
      await fetchRequests();
    } catch (error) {
      console.error("Error confirming purchase:", error);
      // ✨ **新增的錯誤處理邏輯** ✨
      if (error.response && error.response.status === 409) {
        alert('這個已經買好囉。畫面將會自動為您更新。');
        // 關閉彈窗並刷新資料
        setShowPurchaseModal(false); 
        await fetchRequests();
      } else {
          setUpdateError(error.response?.data?.message || '無法確認購買，請再試一次。');
      }    
    } finally {
      setIsUpdatingRequest(false);
    }
  };

  const deleteRequest = async (id) => {
    const confirmed = window.confirm("您確定要刪除此採購需求嗎？相關的購買記錄和留言也會一併移除。");
    if (confirmed) {
      if (!currentUser) {
        alert("請登入以刪除採購需求。");
        setUpdateError("請登入以刪除採購需求。");
        return;
      }
      setIsDeletingRequest(true);
      setSelectedRequestId(id); // To show spinner on the correct card
      setUpdateError(null);
      try {
        const token = await currentUser.getIdToken();
        await axios.delete(`/api/requirements/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        await fetchRequests();
      } catch (error) {
        console.error("Error deleting request:", error);
        setUpdateError(error.response?.data?.message || '無法刪除採購需求，請再試一次。');
      } finally {
        setIsDeletingRequest(false);
        setSelectedRequestId(null);
      }
    }
  };

  const addComment = async (requestId) => {
    const trimmedComment = newComment.trim();
    if (!trimmedComment) { alert('請輸入留言內容！'); return; }
    if (!currentUser) { alert("請登入以新增留言。"); setUpdateError("請登入以新增留言。"); return; }

    setIsAddingComment(true);
    setUpdateError(null);
    try {
      const token = await currentUser.getIdToken();
      const payload = { text: trimmedComment };
      await axios.post(`/api/requirements/${requestId}/comments`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
      setNewComment('');
      closeCommentModal();
      await fetchRequests();
    } catch (error) {
      console.error("Error adding comment:", error);
      setUpdateError(error.response?.data?.message || '無法新增留言，請再試一次。');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (requestId, commentId) => {
    const confirmed = window.confirm("您確定要刪除此則留言嗎？");
    if (confirmed) {
      if (!currentUser) { alert("請登入以刪除留言。"); setUpdateError("請登入以刪除留言。"); return; }
      // Consider adding a specific loading state for deleting comments if needed
      setUpdateError(null);
      try {
        const token = await currentUser.getIdToken();
        await axios.delete(`/api/requirements/${requestId}/comments/${commentId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        await fetchRequests(); // Refresh to show updated comments
      } catch (error) {
        console.error("Error deleting comment:", error);
        setUpdateError(error.response?.data?.message || '無法刪除留言，請再試一次。');
      }
    }
  };

  const openCommentModal = useCallback((request) => {
    setCurrentRequestForComment(request);
    setIsCommentModalOpen(true);
    setNewComment('');
    setCommenterName(currentUser?.displayName || ''); // Pre-fill name from auth
    setUpdateError(null);
  }, [currentUser]);

  const closeCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
    setCurrentRequestForComment(null);
    setUpdateError(null);
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (isCommentModalOpen) closeCommentModal();
        if (showModal) { setShowModal(false); setSubmitError(null); }
        if (showPurchaseModal) { setShowPurchaseModal(false); setUpdateError(null); setSelectedRequestId(null); }
        if (showRecordsModal) setShowRecordsModal(false);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    if (isCommentModalOpen && commenterNameInputRef.current && !commenterName && !currentUser?.displayName) {
      commenterNameInputRef.current.focus();
    }
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isCommentModalOpen, showModal, showPurchaseModal, showRecordsModal, closeCommentModal, commenterName, currentUser]);

  const exportPurchaseRecordsToCSV = () => {
    if (filteredPurchaseRecords.length === 0) { alert("沒有可匯出的購買記錄。"); return; }
    // alert("正在準備匯出 CSV 檔案，請留意瀏覽器的下載提示。");
    const escapeCSVField = (field) => `"${String(field === null || field === undefined ? '' : field).replace(/"/g, '""')}"`;
    const headers = ["項目名稱", "提出者", "購買金額", "需求日期", "購買日期", "購買人", "會計類別"];
    let csvContent = "\uFEFF" + headers.map(escapeCSVField).join(',') + '\r\n'; // Add BOM for UTF-8 Excel compatibility
    filteredPurchaseRecords.forEach(record => {
      const row = [
        record.title, record.requester, record.purchaseAmount,
        record.requestDate ? new Date(record.requestDate).toLocaleDateString() : '',
        record.purchaseDate ? new Date(record.purchaseDate).toLocaleDateString() : '',
        record.purchaserName || "", record.accountingCategory || ""
      ];
      csvContent += row.map(escapeCSVField).join(',') + '\r\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase-records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredRequests = useMemo(() => requests.filter(req => filter === 'all' || req.status === filter), [requests, filter]);
  const sortedRequests = useMemo(() => [...filteredRequests].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0); const dateB = new Date(b.createdAt || 0);
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  }), [filteredRequests, sortBy]);

  const filteredPurchaseRecords = useMemo(() => {
    return purchaseRecords.filter(record => {
      const matchesPurchaser = filterPurchaserName ? record.purchaserName?.toLowerCase().includes(filterPurchaserName.toLowerCase()) : true;
      let Rdate = null; try { Rdate = new Date(record.purchaseDate); if(isNaN(Rdate.getTime())) Rdate = null; } catch (e) { Rdate = null; }
      let Sdate = null; try { Sdate = new Date(filterStartDate); if(isNaN(Sdate.getTime())) Sdate = null; } catch (e) { Sdate = null; }
      let Edate = null; try { Edate = new Date(filterEndDate); if(isNaN(Edate.getTime())) Edate = null; } catch (e) { Edate = null; }
      const matchesStartDate = Sdate && Rdate ? Rdate >= Sdate : true;
      const matchesEndDate = Edate && Rdate ? Rdate <= Edate : true;
      return matchesPurchaser && matchesStartDate && matchesEndDate;
    });
  }, [purchaseRecords, filterPurchaserName, filterStartDate, filterEndDate]);

  const generalErrorForDisplay = (updateError && !showPurchaseModal && !isCommentModalOpen) || (fetchError && requests.length > 0 && !isLoadingRequests) ? (updateError || fetchError) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">Purchase Board</h1>
          {/* 將按鈕群組起來，並設定在小螢幕上佔滿寬度 */}
         <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button onClick={() => setShowRecordsModal(true)} className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"> <Receipt size={20} /> 購買記錄 </button>
          <button onClick={() => { setSubmitError(null); setFormData({ title: '', description: '', requester: currentUser?.displayName || '', accountingCategory: '' }); setShowModal(true);}} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"> <Plus size={20} /> 新增需求 </button>
         </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center md:justify-between">
  {/* 篩選區塊：保持標籤和按鈕在同一行 */}
  <div className="flex items-center gap-2">
    <span className="text-gray-700 font-medium shrink-0">篩選：</span>
    <div className="flex-grow grid grid-cols-3 gap-2">
      {['all', 'pending', 'purchased'].map(f => (
        <button
          key={f}
          onClick={() => setFilter(f)}
          className={`px-3 py-2 rounded-full text-sm transition-colors text-center ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
        >
          {f === 'all' ? '全部' : statusLabels[f]?.text || f}
        </button>
      ))}
    </div>
  </div>

  {/* 排序區塊：保持標籤和選單在同一行 */}
  <div className="flex items-center gap-2">
    <span className="text-gray-700 font-medium shrink-0">排序：</span>
    <select 
      value={sortBy} 
      onChange={(e) => setSortBy(e.target.value)} 
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
    >
      <option value="newest">最新建立</option>
      <option value="oldest">最舊建立</option>
    </select>
  </div>
  </div>
        </div>

        {generalErrorForDisplay && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
            <p className="font-bold">發生錯誤</p>
            <p>{generalErrorForDisplay}</p>
          </div>
        )}

        {isLoadingRequests && (
          <div className="text-center py-10">
            <SpinnerIcon className="text-blue-500 h-12 w-12 mx-auto" />
            <p className="text-xl mt-4 text-gray-700">載入需求中...</p>
          </div>
        )}

        {!isLoadingRequests && fetchError && requests.length === 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-6 my-6 rounded-md shadow text-center">
            <div className="flex flex-col items-center">
                <svg className="fill-current h-16 w-16 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM9 5v6h2V5H9zm0 8v2h2v-2H9z"/></svg>
                <p className="text-xl font-semibold text-red-700">錯誤：無法載入採購需求</p>
                <p className="text-md text-red-600 mt-1 mb-4">{fetchError}</p>
                <button
                  onClick={fetchRequests}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  重新嘗試
                </button>
            </div>
          </div>
        )}

        {!isLoadingRequests && !fetchError && requests.length === 0 && (
          <div className="text-center py-10">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-xl font-medium text-gray-900">目前沒有任何採購需求</h3>
            <p className="mt-1 text-base text-gray-500">點擊「新增需求」按鈕來建立您的第一個採購單吧！</p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => { setSubmitError(null); setFormData({ title: '', description: '', requester: currentUser?.displayName || '', accountingCategory: '' }); setShowModal(true);}}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus size={20} className="-ml-1 mr-2 h-5 w-5" />
                新增需求
              </button>
            </div>
          </div>
        )}

        {requests.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedRequests.map((request) => (
              <div key={request.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-opacity ${(isUpdatingRequest || isDeletingRequest) && selectedRequestId === request.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="p-4 pb-0"> <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusLabels[request.status]?.color || 'bg-gray-100 text-gray-800'}`}> {statusLabels[request.status]?.text || request.status} </span> </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{request.title || request.text}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3 h-12">{request.description}</p> {/* Fixed height for description */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1"> <Calendar size={16} /> <span>{new Date(request.createdAt).toLocaleDateString()}</span> </div>
                    {request.comments?.length > 0 && (<div className="flex items-center gap-1"> <MessageCircle size={16} /> <span>{request.comments.length}</span> </div>)}
                  </div>
                  {request.requesterName && (<div className="flex items-center gap-1 text-sm text-gray-600 mb-2"> <User size={16} /> <span>提出者：{request.requesterName}</span> </div>)}
                  {request.accountingCategory && (<div className="flex items-center gap-1 text-sm text-gray-600 mb-4"> <Tag size={16} className="text-gray-500" /> <span>會計類別：{request.accountingCategory}</span> </div>)}
                  {request.status === 'purchased' && request.purchaseAmount && ( <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"> <div className="flex items-center gap-2 text-green-800"> <DollarSign size={16} /> <span className="font-medium">購買金額：NT$ {request.purchaseAmount.toLocaleString()}</span> </div> <div className="text-sm text-green-600 mt-1"> 購買日期：{request.purchaseDate ? new Date(request.purchaseDate).toLocaleDateString() : 'N/A'} </div> {request.purchaserName && (<div className="text-sm text-green-600 mt-1"> 購買人：{request.purchaserName} </div>)} </div> )}
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => openCommentModal(request)} className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm" disabled={isDeletingRequest || isUpdatingRequest || isAddingComment}> <MessageCircle size={16} /> 留言 ({request.comments?.length || 0}) </button>
                    {request.status === 'pending' && (<button onClick={() => updateStatus(request.id, 'purchased')} className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors text-sm disabled:opacity-50" disabled={(isUpdatingRequest && selectedRequestId === request.id) || isDeletingRequest || isAddingComment}> {(isUpdatingRequest && selectedRequestId === request.id && newStatusForUpdate === 'purchased') ? <SpinnerIcon /> : '✓'} 標記為已購買 </button>)}
                    {request.status === 'purchased' && (<button onClick={() => updateStatus(request.id, 'pending')} className="flex items-center gap-1 px-3 py-1 text-orange-600 hover:bg-orange-50 rounded transition-colors text-sm disabled:opacity-50" disabled={(isUpdatingRequest && selectedRequestId === request.id) || isDeletingRequest || isAddingComment}> {(isUpdatingRequest && selectedRequestId === request.id && newStatusForUpdate === 'pending') ? <SpinnerIcon /> : <RotateCcw size={16} />}撤銷購買 </button>)}
                    <button onClick={() => deleteRequest(request.id)} className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm ml-auto disabled:opacity-50" disabled={(isDeletingRequest && selectedRequestId === request.id) || isUpdatingRequest || isAddingComment}> {(isDeletingRequest && selectedRequestId === request.id) ? <SpinnerIcon /> : <Trash2 size={16} />}刪除 </button>
                  </div>
                  {request.comments?.length > 0 && ( <div className="border-t pt-3 mt-3"> <h4 className="text-sm font-semibold text-gray-700 mb-2">留言列表：</h4> <div className="space-y-2 max-h-32 overflow-y-auto"> {request.comments.map((comment) => ( <div key={comment.id} className="bg-gray-50 rounded p-2 group relative"> <div className="flex justify-between items-start mb-1"> <div> <span className="font-medium text-sm text-gray-900">{comment.authorName || comment.userId}</span> <span className="text-xs text-gray-500 ml-2">{new Date(comment.createdAt).toLocaleString()}</span> </div> {currentUser && comment.userId === currentUser.uid && (<button onClick={() => handleDeleteComment(request.id, comment.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 -mt-1" title="刪除留言" disabled={isDeletingRequest || isUpdatingRequest || isAddingComment}> <Trash2 size={14} /> </button> )} </div> <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.text}</p> </div> ))} </div> </div> )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals */}
        {showModal && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"> <div className="bg-white rounded-lg shadow-xl w-full max-w-md"> <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center"> <h2 className="text-lg font-semibold">新增採購需求</h2> <button onClick={() => {setShowModal(false); setSubmitError(null);}} className="text-white hover:bg-blue-600 p-1 rounded-full transition-colors"> <X size={20} /> </button> </div> <div className="p-6 space-y-4"> {submitError && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded relative" role="alert"> <strong className="font-bold">提交錯誤!</strong> <span className="block sm:inline"> {submitError}</span> </div>} <div> <label htmlFor="formTitle" className="block text-sm font-medium text-gray-700 mb-2"> 需求標題* </label> <input id="formTitle" type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="請輸入標題..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required /> </div> <div> <label htmlFor="formDescription" className="block text-sm font-medium text-gray-700 mb-2"> 詳細描述* </label> <textarea id="formDescription" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="請描述需求的詳細內容..." rows="4" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /> </div> <div> <label htmlFor="formRequester" className="block text-sm font-medium text-gray-700 mb-2"> 提出者姓名 </label> <input id="formRequester" type="text" value={currentUser?.displayName || formData.requester} onChange={(e) => !currentUser?.displayName && setFormData({...formData, requester: e.target.value})} placeholder="您的姓名" className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${currentUser?.displayName ? 'bg-gray-100' : ''}`} readOnly={!!currentUser?.displayName} /> </div> <div> <label htmlFor="formAccounting" className="block text-sm font-medium text-gray-700 mb-2"> 會計類別 (選填) </label> <input id="formAccounting" type="text" value={formData.accountingCategory} onChange={(e) => setFormData({...formData, accountingCategory: e.target.value})} placeholder="請輸入會計科目或類別..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /> </div> <div className="flex gap-3 pt-4"> <button type="button" onClick={() => {setShowModal(false); setSubmitError(null);}} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors" disabled={isSubmittingRequest}> 取消 </button> <button type="button" onClick={handleSubmit} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2" disabled={isSubmittingRequest}> {isSubmittingRequest && <SpinnerIcon />} {isSubmittingRequest ? '提交中...' : '提交需求'} </button> </div> </div> </div> </div> )}
        {showPurchaseModal && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"> <div className="bg-white rounded-lg shadow-xl w-full max-w-md"> <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center"> <h2 className="text-lg font-semibold">確認購買</h2> <button onClick={() => { setShowPurchaseModal(false); setUpdateError(null); setSelectedRequestId(null); }} className="text-white hover:bg-green-600 p-1 rounded-full transition-colors"> <X size={20} /> </button> </div> <div className="p-6"> {updateError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded text-center">{updateError}</p>} <p className="text-gray-700 mb-4"> 請輸入購買金額與購買人以完成採購： </p> <div className="mb-4"> <label htmlFor="purchaseAmount" className="block text-sm font-medium text-gray-700 mb-2"> 購買金額 (NT$)* </label> <input id="purchaseAmount" type="number" value={purchaseAmount} onChange={(e) => setPurchaseAmount(e.target.value)} placeholder="請輸入金額..." min="0" step="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div className="mb-6"> <label htmlFor="purchaserName" className="block text-sm font-medium text-gray-700 mb-2"> 購買人* </label> <input id="purchaserName" type="text" value={purchaserNameInput} onChange={(e) => setPurchaserNameInput(e.target.value)} placeholder="請輸入購買人姓名..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div className="flex gap-3"> <button type="button" onClick={() => { setShowPurchaseModal(false); setUpdateError(null); setSelectedRequestId(null); }} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors" disabled={isUpdatingRequest}> 取消 </button> <button type="button" onClick={confirmPurchase} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2" disabled={isUpdatingRequest}> {isUpdatingRequest && <SpinnerIcon />} {isUpdatingRequest ? '處理中...' : '確認購買'} </button> </div> </div> </div> </div> )}
        {showRecordsModal && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"> <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col"> <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center"> <h2 className="text-lg font-semibold">購買記錄</h2> <div className="flex items-center gap-3"> <button onClick={exportPurchaseRecordsToCSV} className="flex items-center gap-2 bg-white text-green-700 hover:bg-gray-100 py-2 px-3 rounded-md text-sm font-medium transition-colors" title="匯出目前篩選的記錄為 CSV"> <Download size={18} /> 匯出 CSV </button> <button onClick={() => setShowRecordsModal(false)} className="text-white hover:bg-green-600 p-1 rounded-full transition-colors" title="關閉"> <X size={20} /> </button> </div> </div> <div className="p-6 overflow-y-auto flex-grow"> <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"> <h4 className="text-md font-semibold text-gray-800 mb-3">篩選條件</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div> <label htmlFor="filterPurchaser" className="block text-sm font-medium text-gray-700 mb-1">購買人</label> <input id="filterPurchaser" type="text" placeholder="依購買人篩選..." value={filterPurchaserName} onChange={(e) => setFilterPurchaserName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label htmlFor="filterSDate" className="block text-sm font-medium text-gray-700 mb-1">購買日期 (起)</label> <input id="filterSDate" type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label htmlFor="filterEDate" className="block text-sm font-medium text-gray-700 mb-1">購買日期 (迄)</label> <input id="filterEDate" type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> </div> </div> {filteredPurchaseRecords.length === 0 ? ( <div className="text-center py-8"> <Receipt size={48} className="mx-auto text-gray-400 mb-4" /> <p className="text-gray-500">無符合條件的購買記錄</p> </div> ) : ( <div className="space-y-4"> <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"> <div className="flex items-center gap-2 text-green-800 mb-2"> <DollarSign size={20} /> <span className="font-semibold">總支出金額：NT$ {filteredPurchaseRecords.reduce((total, record) => total + (record.purchaseAmount || 0), 0).toLocaleString()}</span> </div> <p className="text-sm text-green-600">共 {filteredPurchaseRecords.length} 筆購買記錄</p> </div> {filteredPurchaseRecords.map((record) => ( <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"> <div className="flex justify-between items-start mb-3"> <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3> <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"> 已購買 </span> </div> <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm"> <div> <span className="text-gray-600">提出者：</span> <span className="font-medium">{record.requester}</span> </div> <div> <span className="text-gray-600">購買金額：</span> <span className="font-medium text-green-600">NT$ {(record.purchaseAmount || 0).toLocaleString()}</span> </div> <div> <span className="text-gray-600">需求日期：</span> <span className="font-medium">{record.requestDate ? new Date(record.requestDate).toLocaleDateString() : 'N/A'}</span> </div> <div> <span className="text-gray-600">購買日期：</span> <span className="font-medium">{record.purchaseDate ? new Date(record.purchaseDate).toLocaleDateString() : 'N/A'}</span> </div> {record.purchaserName && (<div className="sm:col-span-2"> <span className="text-gray-600">購買人：</span> <span className="font-medium">{record.purchaserName}</span> </div>)} {record.accountingCategory && (<div className="sm:col-span-2"> <span className="text-gray-600">會計類別：</span> <span className="font-medium">{record.accountingCategory}</span> </div>)} </div> </div> ))} </div> )} </div> </div> </div> )}
        {isCommentModalOpen && currentRequestForComment && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" onClick={closeCommentModal} > <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 transform transition-all duration-300 ease-in-out scale-100" onClick={(e) => e.stopPropagation()} > <div className="flex justify-between items-center"> <h2 className="text-xl font-semibold text-gray-800"> 發表留言於：<span className="font-bold truncate max-w-xs inline-block align-bottom">{currentRequestForComment?.title || currentRequestForComment?.text || '需求'}</span> </h2> <button onClick={closeCommentModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors" title="關閉" > <X size={24} /> </button> </div> {updateError && <p className="text-red-500 text-sm mb-2 bg-red-100 p-2 rounded text-center">{updateError}</p>} <div className="space-y-4"> <div> <label htmlFor="commenterNameModal" className="block text-sm font-medium text-gray-700 mb-1">您的姓名*</label> <input id="commenterNameModal" ref={commenterNameInputRef} type="text" value={commenterName} onChange={(e) => setCommenterName(e.target.value)} placeholder="請輸入您的姓名..." className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${currentUser?.displayName ? 'bg-gray-100' : ''}`} readOnly={!!currentUser?.displayName} /> </div> <div> <label htmlFor="newCommentModal" className="block text-sm font-medium text-gray-700 mb-1">留言內容*</label> <textarea id="newCommentModal" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="請輸入留言內容..." rows="4" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /> </div> </div> <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4"> <button type="button" onClick={closeCommentModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium" disabled={isAddingComment}> 取消 </button> <button type="button" onClick={() => { if (currentRequestForComment) { addComment(currentRequestForComment.id); } }} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50" disabled={isAddingComment || !newComment.trim()} > {isAddingComment && <SpinnerIcon />} {isAddingComment ? '傳送中...' : '送出留言'} </button> </div> </div> </div> )}
      </div>
    </div>
  );
};

export default PurchaseRequestBoard;
