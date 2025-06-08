import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, MessageCircle, Edit, Trash2, X, Send, Calendar, User, RotateCcw, Receipt, DollarSign, Tag, Download, Loader2 } from 'lucide-react'; // Added Loader2
import axios from 'axios';
import { useAuth } from './AuthContext';

// Simple Spinner Icon Component
const SpinnerIcon = () => <Loader2 size={16} className="animate-spin" />;

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
  const [updateError, setUpdateError] = useState(null); // Used for general updates, purchase confirm, revert, and delete errors
  const [isDeletingRequest, setIsDeletingRequest] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  // commentError can reuse updateError or have its own state if specific display is needed in comment modal.
  // For now, comment errors will also use `updateError` displayed in the comment modal.


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
    setIsLoadingRequests(true); // 將 isLoadingRequests 移到 try 之前
    setFetchError(null);       // 清除之前的錯誤

    try {
      const response = await axios.get('/api/requirements');

      // **** 重要修改：檢查 response.data 是否為陣列 ****
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
        // 如果 response.data 不是陣列，將其視為錯誤或空資料
        console.error('API response for /api/requirements is not an array:', response.data);
        setFetchError('無法獲取採購請求：資料格式不正確。');
        setRequests([]); // *** 設定為空陣列以避免後續渲染錯誤 ***
        setPurchaseRecords([]); // 也清空購買記錄
      }
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
      setFetchError('無法載入採購請求。 ' + (error.response?.data?.message || error.message));
      setRequests([]); // *** 發生錯誤時，也設定為空陣列 ***
      setPurchaseRecords([]); // 清空購買記錄
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    setIsLoadingRequests(true);
    setFetchError(null);
    fetchRequests();
  }, [fetchRequests]);

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
    if (newStatus === 'purchased') {
      setUpdateError(null);
      setShowPurchaseModal(true);
    } else {
      if (!currentUser) {
        alert("請登入以更新狀態。");
        setUpdateError("請登入以更新狀態。");
        return;
      }
      setIsUpdatingRequest(true);
      setUpdateError(null);
      try {
        const token = await currentUser.getIdToken();
        const payload = { status: 'pending', purchaseAmount: null, purchaseDate: null, purchaserName: null };
        await axios.put(`/api/requirements/${id}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
        await fetchRequests();
      } catch (error) {
        console.error("Error reverting status:", error);
        setUpdateError(error.response?.data?.message || '無法還原狀態，請再試一次。');
      } finally {
        setIsUpdatingRequest(false);
        setSelectedRequestId(null);
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
        purchaserName: purchaserNameInput.trim()
      };
      await axios.put(`/api/requirements/${selectedRequestId}`, payload, { headers: { 'Authorization': `Bearer ${token}` } });
      setPurchaseAmount('');
      setPurchaserNameInput('');
      setShowPurchaseModal(false);
      await fetchRequests();
    } catch (error) {
      console.error("Error confirming purchase:", error);
      setUpdateError(error.response?.data?.message || '無法確認購買，請再試一次。');
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
      setSelectedRequestId(id);
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
    const trimmedName = commenterName.trim();
    const trimmedComment = newComment.trim();

    if (!trimmedComment) { // Name is pre-filled, only check comment content
      alert('請輸入留言內容！');
      return;
    }
    if (!currentUser) {
      alert("請登入以新增留言。");
      setUpdateError("請登入以新增留言。"); // Use updateError for comment modal
      return;
    }

    setIsAddingComment(true);
    setUpdateError(null); // Clear previous update errors before new attempt

    try {
      const token = await currentUser.getIdToken();
      const payload = {
        text: trimmedComment,
        // authorName: trimmedName, // Backend should use currentUser.displayName or uid
      };
      await axios.post(`/api/requirements/${requestId}/comments`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setNewComment('');
      // commenterName is already pre-filled, no need to reset usually, or reset if intended
      closeCommentModal();
      await fetchRequests(); // Refresh data to show new comment
    } catch (error) {
      console.error("Error adding comment:", error);
      setUpdateError(error.response?.data?.message || '無法新增留言，請再試一次。');
      // Keep modal open for retry
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (requestId, commentId) => {
    // TODO: API for comments
    console.log(`Deleting comment ${commentId} from request ${requestId} (API call needed)`);
    await fetchRequests();
  };

  const openCommentModal = useCallback((request) => {
    setCurrentRequestForComment(request);
    setIsCommentModalOpen(true);
    setNewComment('');
    setCommenterName(currentUser?.displayName || '');
    setUpdateError(null); // Clear any previous errors when opening modal
  }, [currentUser]);

  const closeCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
    setCurrentRequestForComment(null);
    setUpdateError(null); // Clear errors when modal is closed
  }, []);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (isCommentModalOpen) closeCommentModal();
        if (showModal) { setShowModal(false); setSubmitError(null); }
        if (showPurchaseModal) { setShowPurchaseModal(false); setUpdateError(null); }
        if (showRecordsModal) setShowRecordsModal(false);
      }
    };
    document.addEventListener('keydown', handleEscapeKey);
    if (isCommentModalOpen && commenterNameInputRef.current && !commenterName) { // Focus if name is empty
      commenterNameInputRef.current.focus();
    }
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isCommentModalOpen, showModal, showPurchaseModal, showRecordsModal, closeCommentModal, commenterName]);

  const exportPurchaseRecordsToCSV = () => {
    if (filteredPurchaseRecords.length === 0) { alert("沒有可匯出的購買記錄。"); return; }
    alert("正在準備匯出 CSV 檔案，請留意瀏覽器的下載提示。");
    const escapeCSVField = (field) => `"${String(field === null || field === undefined ? '' : field).replace(/"/g, '""')}"`;
    const headers = ["ID", "項目名稱", "提出者", "購買金額", "需求日期", "購買日期", "購買人", "會計類別"];
    let csvContent = headers.map(escapeCSVField).join(',') + '\r\n';
    filteredPurchaseRecords.forEach(record => {
      const row = [
        record.id, record.title, record.requester, record.purchaseAmount,
        record.requestDate ? new Date(record.requestDate).toLocaleDateString() : '',
        record.purchaseDate ? new Date(record.purchaseDate).toLocaleDateString() : '',
        record.purchaserName || "", record.accountingCategory || ""
      ];
      csvContent += row.map(escapeCSVField).join(',') + '\r\n';
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase-records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredRequests = requests.filter(req => filter === 'all' || req.status === filter);
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0); const dateB = new Date(b.createdAt || 0);
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const filteredPurchaseRecords = React.useMemo(() => {
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

  if (isLoadingRequests && requests.length === 0) {
    return <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center"><p className="text-xl">載入需求中...</p></div>;
  }

  if (fetchError && requests.length === 0) {
    return <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center"><p className="text-xl text-red-500">錯誤: {fetchError}</p></div>;
  }

  const generalError = (updateError && !showPurchaseModal && !isCommentModalOpen) || (fetchError && requests.length > 0) ? (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
      <p className="font-bold">操作時發生錯誤</p>
      <p>{updateError || fetchError}</p>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {generalError}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">採購需求告示牌</h1>
            <div className="flex gap-3">
              <button onClick={() => setShowRecordsModal(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"> <Receipt size={20} /> 購買記錄 </button>
              <button onClick={() => { setSubmitError(null); setFormData({ title: '', description: '', requester: currentUser?.displayName || '', accountingCategory: '' }); setShowModal(true);}} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"> <Plus size={20} /> 新增需求 </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2"> <span className="text-gray-700 font-medium">篩選：</span> {['all', 'pending', 'purchased'].map(f => ( <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-sm transition-colors ${filter === f ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}> {f === 'all' ? '全部' : statusLabels[f]?.text || f} </button> ))} </div>
            <div className="flex items-center gap-2"> <span className="text-gray-700 font-medium">排序：</span> <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"> <option value="newest">最新建立</option> <option value="oldest">最舊建立</option> </select> </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedRequests.map((request) => (
            <div key={request.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${ (isUpdatingRequest || isDeletingRequest) && selectedRequestId === request.id ? 'opacity-50' : '' }`}>
              <div className="p-4 pb-0"> <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusLabels[request.status]?.color || 'bg-gray-100 text-gray-800'}`}> {statusLabels[request.status]?.text || request.status} </span> </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{request.title || request.text}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{request.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1"> <Calendar size={16} /> <span>{new Date(request.createdAt).toLocaleDateString()}</span> </div>
                  {request.comments?.length > 0 && (<div className="flex items-center gap-1"> <MessageCircle size={16} /> <span>{request.comments.length}</span> </div>)}
                </div>
                {request.requesterName && (<div className="flex items-center gap-1 text-sm text-gray-600 mb-2"> <User size={16} /> <span>提出者：{request.requesterName}</span> </div>)}
                {request.accountingCategory && (<div className="flex items-center gap-1 text-sm text-gray-600 mb-4"> <Tag size={16} className="text-gray-500" /> <span>會計類別：{request.accountingCategory}</span> </div>)}
                {request.status === 'purchased' && request.purchaseAmount && ( <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"> <div className="flex items-center gap-2 text-green-800"> <DollarSign size={16} /> <span className="font-medium">購買金額：NT$ {request.purchaseAmount.toLocaleString()}</span> </div> <div className="text-sm text-green-600 mt-1"> 購買日期：{request.purchaseDate ? new Date(request.purchaseDate).toLocaleDateString() : 'N/A'} </div> {request.purchaserName && (<div className="text-sm text-green-600 mt-1"> 購買人：{request.purchaserName} </div>)} </div> )}
                <div className="flex gap-2 mb-3">
                  <button onClick={() => openCommentModal(request)} className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm" disabled={isDeletingRequest || isUpdatingRequest || isAddingComment}> <MessageCircle size={16} /> 留言 ({request.comments?.length || 0}) </button>
                  {request.status === 'pending' && (<button onClick={() => updateStatus(request.id, 'purchased')} className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors text-sm disabled:opacity-50" disabled={isUpdatingRequest || isDeletingRequest || isAddingComment}> {(isUpdatingRequest && selectedRequestId === request.id) ? <SpinnerIcon /> : '✓'} 標記為已購買 </button>)}
                  {request.status === 'purchased' && (<button onClick={() => updateStatus(request.id, 'pending')} className="flex items-center gap-1 px-3 py-1 text-orange-600 hover:bg-orange-50 rounded transition-colors text-sm disabled:opacity-50" disabled={isUpdatingRequest || isDeletingRequest || isAddingComment}> {(isUpdatingRequest && selectedRequestId === request.id) ? <SpinnerIcon /> : <RotateCcw size={16} />}撤銷購買 </button>)}
                  <button onClick={() => deleteRequest(request.id)} className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm ml-auto disabled:opacity-50" disabled={isDeletingRequest || isUpdatingRequest || isAddingComment}> {(isDeletingRequest && selectedRequestId === request.id) ? <SpinnerIcon /> : <Trash2 size={16} />}刪除 </button>
                </div>
                {request.comments?.length > 0 && ( <div className="border-t pt-3 mt-3"> <h4 className="text-sm font-semibold text-gray-700 mb-2">留言列表：</h4> <div className="space-y-2"> {request.comments.map((comment) => ( <div key={comment.id} className="bg-gray-50 rounded p-2 group relative"> <div className="flex justify-between items-start mb-1"> <div> <span className="font-medium text-sm text-gray-900">{comment.authorName || comment.author}</span> <span className="text-xs text-gray-500 ml-2">{new Date(comment.date).toLocaleDateString()}</span> </div> <button onClick={() => handleDeleteComment(request.id, comment.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="刪除留言" disabled={isDeletingRequest || isUpdatingRequest || isAddingComment}> <Trash2 size={14} /> </button> </div> <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p> </div> ))} </div> </div> )}
              </div>
            </div>
          ))}
        </div>

        {showPurchaseModal && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"> <div className="bg-white rounded-lg shadow-xl w-full max-w-md"> <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center"> <h2 className="text-lg font-semibold">確認購買</h2> <button onClick={() => { setShowPurchaseModal(false); setUpdateError(null); setPurchaseAmount(''); setSelectedRequestId(null); }} className="text-white hover:bg-green-600 p-1 rounded transition-colors"> <X size={20} /> </button> </div> <div className="p-6"> {updateError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{updateError}</p>} <p className="text-gray-700 mb-4"> 請輸入購買金額以確認完成採購： </p> <div className="mb-6"> <label className="block text-sm font-medium text-gray-700 mb-2"> 購買金額 (NT$) </label> <input type="number" value={purchaseAmount} onChange={(e) => setPurchaseAmount(e.target.value)} placeholder="請輸入金額..." min="0" step="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div className="mb-6"> <label className="block text-sm font-medium text-gray-700 mb-2"> 購買人 </label> <input type="text" value={purchaserNameInput} onChange={(e) => setPurchaserNameInput(e.target.value)} placeholder="請輸入購買人姓名..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div className="flex gap-3"> <button onClick={() => { setShowPurchaseModal(false); setUpdateError(null); setPurchaseAmount(''); setSelectedRequestId(null); }} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors" disabled={isUpdatingRequest}> 取消 </button> <button onClick={confirmPurchase} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50" disabled={isUpdatingRequest}> {isUpdatingRequest ? <SpinnerIcon /> : null} {isUpdatingRequest ? '處理中...' : '確認購買'} </button> </div> </div> </div> </div> )}
        {showRecordsModal && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"> <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden"> <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center"> <h2 className="text-lg font-semibold">購買記錄</h2> <div className="flex items-center gap-3"> <button onClick={exportPurchaseRecordsToCSV} className="flex items-center gap-2 bg-white text-green-700 hover:bg-gray-100 py-2 px-3 rounded-md text-sm font-medium transition-colors" title="匯出目前篩選的記錄為 CSV"> <Download size={18} /> 匯出 CSV </button> <button onClick={() => setShowRecordsModal(false)} className="text-white hover:bg-green-600 p-1 rounded-full transition-colors" title="關閉"> <X size={20} /> </button> </div> </div> <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]"> <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"> <h4 className="text-md font-semibold text-gray-800 mb-3">篩選條件</h4> <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> <div> <label className="block text-sm font-medium text-gray-700 mb-1">購買人</label> <input type="text" placeholder="依購買人篩選..." value={filterPurchaserName} onChange={(e) => setFilterPurchaserName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label> <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label> <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /> </div> </div> </div> {filteredPurchaseRecords.length === 0 ? ( <div className="text-center py-8"> <Receipt size={48} className="mx-auto text-gray-400 mb-4" /> <p className="text-gray-500">無符合條件的購買記錄</p> </div> ) : ( <div className="space-y-4"> <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"> <div className="flex items-center gap-2 text-green-800 mb-2"> <DollarSign size={20} /> <span className="font-semibold">總支出金額：NT$ {filteredPurchaseRecords.reduce((total, record) => total + (record.purchaseAmount || 0), 0).toLocaleString()}</span> </div> <p className="text-sm text-green-600">共 {filteredPurchaseRecords.length} 筆購買記錄</p> </div> {filteredPurchaseRecords.map((record) => ( <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"> <div className="flex justify-between items-start mb-3"> <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3> <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"> 已購買 </span> </div> <div className="grid grid-cols-2 gap-4 text-sm"> <div> <span className="text-gray-600">提出者：</span> <span className="font-medium">{record.requester}</span> </div> <div> <span className="text-gray-600">購買金額：</span> <span className="font-medium text-green-600">NT$ {(record.purchaseAmount || 0).toLocaleString()}</span> </div> <div> <span className="text-gray-600">需求日期：</span> <span className="font-medium">{record.requestDate ? new Date(record.requestDate).toLocaleDateString() : 'N/A'}</span> </div> <div> <span className="text-gray-600">購買日期：</span> <span className="font-medium">{record.purchaseDate ? new Date(record.purchaseDate).toLocaleDateString() : 'N/A'}</span> </div> {record.purchaserName && (<div className="col-span-2"> <span className="text-gray-600">購買人：</span> <span className="font-medium">{record.purchaserName}</span> </div>)} {record.accountingCategory && (<div className="col-span-2 sm:col-span-1"> <span className="text-gray-600">會計類別：</span> <span className="font-medium">{record.accountingCategory}</span> </div>)} </div> </div> ))} </div> )} </div> </div> </div> )}
        {showModal && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"> <div className="bg-white rounded-lg shadow-xl w-full max-w-md"> <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center"> <h2 className="text-lg font-semibold">新增採購需求</h2> <button onClick={() => {setShowModal(false); setSubmitError(null);}} className="text-white hover:bg-blue-600 p-1 rounded transition-colors"> <X size={20} /> </button> </div> <div className="p-6 space-y-4"> {submitError && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded relative" role="alert"> <strong className="font-bold">提交錯誤!</strong> <span className="block sm:inline"> {submitError}</span> </div>} <div> <label className="block text-sm font-medium text-gray-700 mb-2"> 需求標題 </label> <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="請輸入標題..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-2"> 詳細描述 </label> <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="請描述需求的詳細內容..." rows="4" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-2"> 提出者姓名 </label> <input type="text" value={formData.requester} onChange={(e) => setFormData({...formData, requester: e.target.value})} placeholder="您的姓名 (將由登入資訊確認)" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly={!!currentUser?.displayName} /> </div> <div> <label className="block text-sm font-medium text-gray-700 mb-2"> 會計類別 (選填) </label> <input type="text" value={formData.accountingCategory} onChange={(e) => setFormData({...formData, accountingCategory: e.target.value})} placeholder="請輸入會計科目或類別..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /> </div> <div className="flex gap-3 pt-4"> <button type="button" onClick={() => {setShowModal(false); setSubmitError(null);}} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors" disabled={isSubmittingRequest}> 取消 </button> <button type="button" onClick={handleSubmit} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50" disabled={isSubmittingRequest}> {isSubmittingRequest ? <SpinnerIcon /> : null} {isSubmittingRequest ? '提交中...' : '提交需求'} </button> </div> </div> </div> </div> )}
        {isCommentModalOpen && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out" onClick={closeCommentModal} > <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 transform transition-all duration-300 ease-in-out scale-100" onClick={(e) => e.stopPropagation()} > <div className="flex justify-between items-center"> <h2 className="text-xl font-semibold text-gray-800"> 發表留言於：<span className="font-bold">{currentRequestForComment?.title || currentRequestForComment?.text || '需求'}</span> </h2> <button onClick={closeCommentModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors" title="關閉" > <X size={24} /> </button> </div> {updateError && <p className="text-red-500 text-sm mb-2 bg-red-100 p-2 rounded text-center">{updateError}</p>} <div className="space-y-4"> <div> <label htmlFor="commenterNameModal" className="block text-sm font-medium text-gray-700 mb-1">您的姓名*</label> <input id="commenterNameModal" ref={commenterNameInputRef} type="text" value={commenterName} onChange={(e) => setCommenterName(e.target.value)} placeholder="請輸入您的姓名..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" readOnly={!!currentUser?.displayName} /> </div> <div> <label htmlFor="newCommentModal" className="block text-sm font-medium text-gray-700 mb-1">留言內容*</label> <textarea id="newCommentModal" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="請輸入留言內容..." rows="4" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" /> </div> </div> <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4"> <button type="button" onClick={closeCommentModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium" disabled={isAddingComment}> 取消 </button> <button type="button" onClick={() => { if (currentRequestForComment) { addComment(currentRequestForComment.id); } }} className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50" disabled={isAddingComment} > {isAddingComment ? <SpinnerIcon /> : <Send size={16} />} {isAddingComment ? '傳送中...' : '送出留言'} </button> </div> </div> </div> )}
      </div>
    </div>
  );
};

export default PurchaseRequestBoard;