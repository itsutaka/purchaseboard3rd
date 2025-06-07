import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // Added useCallback
import { Plus, MessageCircle, Edit, Trash2, X, Send, Calendar, User, RotateCcw, Receipt, DollarSign, Tag, Download } from 'lucide-react'; // Added Tag and Download

const API_BASE_URL = '/api'; // Defined API Base URL

const PurchaseRequestBoard = () => {
  const commenterNameInputRef = useRef(null); // Create ref for commenter name input in modal

  const [requests, setRequests] = useState([]); // Initialize with empty array

  const [purchaseRecords, setPurchaseRecords] = useState([]); // Initialize with empty array
  const [isLoading, setIsLoading] = useState(false); // General loading state
  const [error, setError] = useState(null); // General error state

  const [showModal, setShowModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaserNameInput, setPurchaserNameInput] = useState(''); // 1. Add new state
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  // const [activeComments, setActiveComments] = useState({}); // Removed
  const [newComment, setNewComment] = useState('');
  const [commenterName, setCommenterName] = useState(''); // Add this line

  // New states for comment modal
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [currentRequestForComment, setCurrentRequestForComment] = useState(null);

  // Note: isLoading and error states were already added in a previous step, verified here.

  // 1. Add new state variables for filters:
  const [filterPurchaserName, setFilterPurchaserName] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requester: '',
    accountingCategory: '' // Added
  });

  const statusLabels = {
    'pending': { text: '待購買', color: 'bg-yellow-100 text-yellow-800' },
    'purchased': { text: '已購買', color: 'bg-green-100 text-green-800' }
  };

  const createPurchaseRequest = useCallback(async (requestDataFromForm) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/purchaseRequests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestDataFromForm),
      });
      if (!response.ok) {
        const errorData = await response.json(); // Try to get error message from server
        throw new Error(errorData.message || `HTTP error! status: ${response.status} ${response.statusText}`);
      }
      // const createdRequest = await response.json(); // Contains server-generated id, createdAt etc.
      // No need to manually add to state if fetchRequests() re-fetches and updates the whole list
      await fetchRequests(); // Re-fetch all requests to get the new one with server-generated fields
    } catch (e) {
      console.error("Failed to create purchase request:", e);
      setError(e.message);
      // Optionally, re-throw or handle more specifically if the calling function needs to know about the error
      throw e; // Re-throw so handleSubmit knows it failed
    } finally {
      setIsLoading(false);
    }
  }, [fetchRequests]); // fetchRequests is already memoized

  const handleSubmit = async () => { // Made handleSubmit async
    // Basic validation for required fields
    if (!formData.title.trim() || !formData.description.trim() || !formData.requester.trim()) {
      alert('請填寫所有必填欄位：需求標題、詳細描述、提出者姓名。');
      return;
    }

    const requestDataToSubmit = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      requester: formData.requester.trim(),
      accountingCategory: formData.accountingCategory.trim(),
      // Server will set: id, status ('pending' by default), date (createdAt), comments ([])
    };

    try {
      await createPurchaseRequest(requestDataToSubmit);
      // Reset form and close modal only on successful creation
      setFormData({ title: '', description: '', requester: '', accountingCategory: '' });
      setShowModal(false);
    } catch (e) {
      // Error is already set by createPurchaseRequest, console logged.
      // handleSubmit might show an additional user-facing error message here if needed,
      // but for now, relying on the general error display.
      // alert(`提交失敗：${e.message}`); // Example of more direct feedback
    }
  };

  const updateStatus = async (id, newStatus) => { // Made async
    if (newStatus === 'purchased') {
      setSelectedRequestId(id);
      // Clear previous purchase modal inputs when opening for a new "purchase" action
      setPurchaseAmount('');
      setPurchaserNameInput('');
      setShowPurchaseModal(true);
    } else if (newStatus === 'pending') {
      // Logic for reverting to 'pending'
      const dataToUpdate = {
        status: 'pending',
        purchaseAmount: null,
        purchaseDate: null,
        purchaserName: null,
      };
      try {
        await updatePurchaseRequest(id, dataToUpdate);
        // Client-side removal of purchase record is still needed if API doesn't cascade this,
        // or if fetchRequests doesn't imply a refresh of purchaseRecords strong enough
        // for immediate UI consistency in the records modal if it were open.
        // Given fetchPurchaseRecords is called by updatePurchaseRequest IF status was 'purchased',
        // this client-side filter is mainly for immediate UI consistency of purchaseRecords state
        // if the backend doesn't explicitly delete the record or if we don't re-fetch purchaseRecords here.
        // For now, keeping it ensures the record is removed from client view.
        setPurchaseRecords(prevRecords => prevRecords.filter(record => record.id !== id));
        alert('需求狀態已更新為待處理。'); // Feedback
      } catch (e) {
        // Error is already set by updatePurchaseRequest and console logged.
        // alert(`狀態更新失敗：${e.message}`); // More direct feedback if needed
      }
    }
  };

  const confirmPurchase = async () => {
    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      alert('請輸入有效的購買金額');
      return;
    }
    if (!purchaserNameInput.trim()) {
      alert('請輸入購買人姓名');
      return;
    }

    const purchaseDetails = {
      status: 'purchased',
      purchaseAmount: parseFloat(purchaseAmount),
      purchaseDate: new Date().toISOString(), // Server expects full ISO string for consistency
      purchaserName: purchaserNameInput.trim(),
      // accountingCategory is part of the request, not updated here by the user.
      // The backend's /purchase endpoint will copy it from the request to the purchaseRecord.
    };

    try {
      await updatePurchaseRequest(selectedRequestId, purchaseDetails);

      alert('採購已確認！'); // Simple success feedback

      // Cleanup local state and close modal
      setPurchaseAmount('');
      setPurchaserNameInput('');
      setSelectedRequestId(null);
      setShowPurchaseModal(false);

      // The functions updatePurchaseRequest already calls fetchRequests and fetchPurchaseRecords
      // if status was 'purchased', so data should be fresh.

    } catch (e) {
      // Error is already set by updatePurchaseRequest and console logged.
      // alert(`確認採購失敗：${e.message}`); // More direct feedback if needed
      // Modal remains open if API call fails, allowing user to retry or cancel.
    }
  };

  const deletePurchaseRequestAPI = useCallback(async (requestId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/purchaseRequests/${requestId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) { /* Ignore if response isn't JSON */ }
        throw new Error(errorMsg);
      }
      await fetchRequests(); // Refresh data
      // Assuming backend handles deletion of related purchase records and comments.
      // If not, or for immediate UI consistency of purchase records modal:
      // await fetchPurchaseRecords();
      // OR client-side filter: setPurchaseRecords(prev => prev.filter(rec => rec.id !== requestId));
      // For now, relying on fetchRequests and server-side cascade or eventual consistency.
      // The specific client-side filter for purchaseRecords was removed from the handler.
    } catch (e) {
      console.error("Failed to delete purchase request:", e);
      setError(e.message);
      throw e; // Re-throw for the calling function
    } finally {
      setIsLoading(false);
    }
  }, [fetchRequests]);

  const handleDeleteRequest = async (id) => { // Renamed and made async
    const confirmed = window.confirm("您確定要刪除此採購需求嗎？相關的購買記錄和留言也會一併移除。");

    if (confirmed) {
      try {
        await deletePurchaseRequestAPI(id);
        alert('採購需求已刪除。'); // Success feedback
        // The client-side filtering of setRequests and setPurchaseRecords is removed
        // as fetchRequests() will refresh the state from the server.
        // If the purchase records modal were open and needed immediate update without re-fetch,
        // a client-side filter for purchaseRecords might be kept, but fetchRequests should handle it.
      } catch (e) {
        // Error is already set by deletePurchaseRequestAPI and console logged.
        // alert(`刪除失敗：${e.message}`); // Optional: more direct feedback
      }
    }
  };

  const addComment = async (requestId) => { // Make async
    const trimmedName = commenterName.trim();
    const trimmedComment = newComment.trim();

    if (!trimmedName) {
      alert('請輸入您的姓名！');
      return;
    }
    if (!trimmedComment) {
      alert('請輸入留言內容！');
      return;
    }

    const commentData = { // Data to send to server
      author: trimmedName,
      content: trimmedComment,
      // Server will generate id and date (createdAt)
    };

    setIsLoading(true); // Assuming general isLoading for now
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/purchaseRequests/${requestId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status} ${response.statusText}`);
      }

      // const newCommentFromServer = await response.json(); // Contains server-generated id, createdAt

      // Re-fetch all requests to update commentCount and ensure UI consistency
      // This also means the client-side 'comments' array for this request will be reset to []
      // by fetchRequests, preparing for on-demand loading if that's implemented next.
      await fetchRequests();

      // Clear local form state and close modal
      setNewComment('');
      setCommenterName('');
      closeCommentModal();

    } catch (e) {
      console.error("Failed to add comment:", e);
      setError(e.message);
      // Modal remains open for user to retry or see error (if error is displayed in modal)
    } finally {
      setIsLoading(false);
    }
  };

  const updatePurchaseRequest = useCallback(async (requestId, dataToUpdate) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/purchaseRequests/${requestId}`, {
        method: 'PATCH', // Using PATCH for partial updates
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToUpdate),
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) { /* Ignore if response isn't JSON */ }
        throw new Error(errorMsg);
      }
      await fetchRequests(); // Refresh data to ensure consistency
      // If the update was to 'purchased', the purchase record might have been created server-side.
      // Fetching purchase records again ensures the Purchase Records modal is up-to-date.
      if (dataToUpdate.status === 'purchased') {
        await fetchPurchaseRecords();
      }
    } catch (e) {
      console.error("Failed to update purchase request:", e);
      setError(e.message);
      throw e; // Re-throw for the calling function to handle UI state if needed
    } finally {
      setIsLoading(false);
    }
  }, [fetchRequests, fetchPurchaseRecords]); // Added fetchPurchaseRecords

  const handleDeleteComment = (requestId, commentId) => {
    const confirmed = window.confirm("您確定要刪除此留言嗎？"); // Added confirmation

    if (confirmed) { // Proceed only if user confirms
      setRequests(prevRequests =>
        prevRequests.map(request => {
          if (request.id === requestId) {
            const updatedComments = request.comments.filter(
              comment => comment.id !== commentId
            );
            return { ...request, comments: updatedComments };
          }
          return request;
        })
      );
    }
    // If not confirmed, the function does nothing further
  };

  const openCommentModal = useCallback((request) => {
    setCurrentRequestForComment(request);
    setIsCommentModalOpen(true);
    setNewComment('');
    setCommenterName('');
  }, []); // Empty dependency array as setters are stable

  const closeCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
    setCurrentRequestForComment(null);
  }, []); // Empty dependency array as setters are stable

  // useEffect for ESC key to close modals and autofocus
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (isCommentModalOpen) {
          closeCommentModal();
        }
        // Add similar checks for other modals if they should also close on ESC
      }
    };

    if (isCommentModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Autofocus logic
      if (commenterNameInputRef.current) {
        // Optional: setTimeout to ensure element is fully ready
        // setTimeout(() => commenterNameInputRef.current.focus(), 0);
        commenterNameInputRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isCommentModalOpen, closeCommentModal]);

  const fetchPurchaseRecords = useCallback(async () => {
    setIsLoading(true); // Or a dedicated loading state for the modal
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/purchaseRecords`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      // Optional: Process date strings in data if needed
      // const processedData = data.map(rec => ({
      //   ...rec,
      //   requestDate: rec.requestDate ? new Date(rec.requestDate) : null,
      //   purchaseDate: rec.purchaseDate ? new Date(rec.purchaseDate) : null,
      // }));
      // setPurchaseRecords(processedData);
      setPurchaseRecords(data);
    } catch (e) {
      console.error("Failed to fetch purchase records:", e);
      setError(e.message);
      setPurchaseRecords([]); // Clear records on error
    } finally {
      setIsLoading(false); // Or dedicated loading state
    }
  }, []); // API_BASE_URL is module const and setters are stable

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/purchaseRequests`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      const processedData = data.map(req => ({
        ...req,
        comments: [], // Initialize comments as an empty array on the client
        // Optional: Convert date strings to Date objects here if needed for consistency
        // createdAt: req.createdAt ? new Date(req.createdAt) : null,
        // purchaseDate: req.purchaseDate ? new Date(req.purchaseDate) : null,
        // date: req.date ? new Date(req.date) : null,
      }));
      setRequests(processedData);
    } catch (e) {
      console.error("Failed to fetch requests:", e);
      setError(e.message);
      setRequests([]); // Clear requests on error
    } finally {
      setIsLoading(false);
    }
  }, []); // API_BASE_URL is a module constant, setters are stable

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]); // fetchRequests is memoized with useCallback

  const exportPurchaseRecordsToCSV = () => {
    if (filteredPurchaseRecords.length === 0) {
      alert("沒有可匯出的購買記錄。");
      return;
    }

    alert("正在準備匯出 CSV 檔案，請留意瀏覽器的下載提示。"); // Added notification

    // Helper to escape CSV fields
    const escapeCSVField = (field) => {
      const stringField = String(field === null || field === undefined ? '' : field);
      const escapedField = stringField.replace(/"/g, '""');
      return `"${escapedField}"`;
    };

    const headers = [
      "ID", "項目名稱", "提出者", "購買金額",
      "需求日期", "購買日期", "購買人", "會計類別" // Translated headers
    ];

    let csvContent = headers.map(escapeCSVField).join(',') + '\r\n';

    filteredPurchaseRecords.forEach(record => {
      const row = [
        record.id,
        record.title,
        record.requester,
        record.purchaseAmount,
        record.requestDate,
        record.purchaseDate,
        record.purchaserName || "",
        record.accountingCategory || ""
      ];
      csvContent += row.map(escapeCSVField).join(',') + '\r\n';
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel UTF-8 compatibility
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'purchase-records.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    if (filter === 'pending') return req.status === 'pending';
    if (filter === 'purchased') return req.status === 'purchased';
    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
    return 0;
  });

  // 2. Filtering Logic:
  const filteredPurchaseRecords = React.useMemo(() => {
    return purchaseRecords.filter(record => {
      const matchesPurchaser = filterPurchaserName
        ? record.purchaserName?.toLowerCase().includes(filterPurchaserName.toLowerCase())
        : true;

      // Date filtering with validity checks
      let Rdate = null;
      try { Rdate = new Date(record.purchaseDate); if(isNaN(Rdate.getTime())) Rdate = null; } catch (e) { Rdate = null; }
      let Sdate = null;
      try { Sdate = new Date(filterStartDate); if(isNaN(Sdate.getTime())) Sdate = null; } catch (e) { Sdate = null; }
      let Edate = null;
      try { Edate = new Date(filterEndDate); if(isNaN(Edate.getTime())) Edate = null; } catch (e) { Edate = null; }

      const matchesStartDate = Sdate && Rdate ? Rdate >= Sdate : true;
      const matchesEndDate = Edate && Rdate ? Rdate <= Edate : true;

      return matchesPurchaser && matchesStartDate && matchesEndDate;
    });
  }, [purchaseRecords, filterPurchaserName, filterStartDate, filterEndDate]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">採購需求告示牌</h1>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  fetchPurchaseRecords(); // Call fetch first
                  setShowRecordsModal(true);
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Receipt size={20} />
                購買記錄
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus size={20} />
                新增需求
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2">
              <span className="text-gray-700 font-medium">篩選：</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  filter === 'pending'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                待購買
              </button>
              <button
                onClick={() => setFilter('purchased')}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  filter === 'purchased'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                已購買
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">排序：</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">最新建立</option>
                <option value="oldest">最舊建立</option>
              </select>
            </div>
          </div>
        </div>

        {/* Request Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Status Badge */}
              <div className="p-4 pb-0">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusLabels[request.status].color}`}>
                  {statusLabels[request.status].text}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{request.title}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{request.description}</p>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{request.date}</span>
                  </div>
                  {request.comments.length > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageCircle size={16} />
                      <span>{request.comments.length}</span>
                    </div>
                  )}
                </div>

                {request.requester && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2"> {/* Reduced mb for tighter packing */}
                    <User size={16} />
                    <span>提出者：{request.requester} • {request.date}</span>
                  </div>
                )}

                {/* Accounting Category Display */}
                {request.accountingCategory && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                    <Tag size={16} className="text-gray-500" />
                    <span>會計類別：{request.accountingCategory}</span>
                  </div>
                )}

                {request.status === 'purchased' && request.purchaseAmount && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <DollarSign size={16} />
                      <span className="font-medium">購買金額：NT$ {request.purchaseAmount.toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      購買日期：{request.purchaseDate}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => openCommentModal(request)}
                    className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                  >
                    <MessageCircle size={16} />
                    留言 ({request.commentCount || 0}) {/* Use request.commentCount */}
                  </button>

                  {request.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(request.id, 'purchased')}
                      className="flex items-center gap-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors text-sm"
                    >
                      ✓ 標記為已購買
                    </button>
                  )}

                  {request.status === 'purchased' && (
                    <button
                      onClick={() => updateStatus(request.id, 'pending')}
                      className="flex items-center gap-1 px-3 py-1 text-orange-600 hover:bg-orange-50 rounded transition-colors text-sm"
                    >
                      <RotateCcw size={16} />
                      撤銷購買
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteRequest(request.id)} // Changed to handleDeleteRequest
                    className="flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm ml-auto"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Display of existing comments - always visible if comments exist */}
                {request.comments.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">留言列表：</h4>
                    <div className="space-y-2">
                      {request.comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded p-2 group relative">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="font-medium text-sm text-gray-900">{comment.author}</span>
                              <span className="text-xs text-gray-500 ml-2">{comment.date}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteComment(request.id, comment.id)}
                              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="刪除留言"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Inline input form has been removed */}
              </div>
            </div>
          ))}
        </div>

        {/* Purchase Amount Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h2 className="text-lg font-semibold">確認購買</h2>
                <button
                  onClick={() => {
                    setShowPurchaseModal(false);
                    setPurchaseAmount('');
                    setSelectedRequestId(null);
                  }}
                  className="text-white hover:bg-green-600 p-1 rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  請輸入購買金額以確認完成採購：
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    購買金額 (NT$)
                  </label>
                  <input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="請輸入金額..."
                    min="0"
                    step="1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* 2. Update the "Confirm Purchase" Modal: Add new input field for Purchaser Name here */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    購買人
                  </label>
                  <input
                    type="text"
                    value={purchaserNameInput} // Bind to the new state
                    onChange={(e) => setPurchaserNameInput(e.target.value)} // Update the new state
                    placeholder="請輸入購買人姓名..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPurchaseModal(false);
                      setPurchaseAmount('');
                      setSelectedRequestId(null);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmPurchase}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    確認購買
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Records Modal */}
        {showRecordsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h2 className="text-lg font-semibold">購買記錄</h2>
                <div className="flex items-center gap-3"> {/* Wrapper for buttons */}
                  <button
                    onClick={exportPurchaseRecordsToCSV} // Connected the function
                    className="flex items-center gap-2 bg-white text-green-700 hover:bg-gray-100 py-2 px-3 rounded-md text-sm font-medium transition-colors"
                    title="匯出目前篩選的記錄為 CSV"
                  >
                    <Download size={18} />
                    匯出 CSV
                  </button>
                  <button
                    onClick={() => setShowRecordsModal(false)}
                    className="text-white hover:bg-green-600 p-1 rounded-full transition-colors" // Keep X button style distinct
                    title="關閉"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                {/* 3. Update the "Purchase Records" Modal: Add Filter Inputs */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">篩選條件</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">購買人</label>
                      <input
                        type="text"
                        placeholder="依購買人篩選..."
                        value={filterPurchaserName}
                        onChange={(e) => setFilterPurchaserName(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Update the "Purchase Records" Modal: Use filteredPurchaseRecords */}
                {filteredPurchaseRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">無符合條件的購買記錄</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 3. Update Total Summation */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <DollarSign size={20} />
                        <span className="font-semibold">總支出金額：NT$ {filteredPurchaseRecords.reduce((total, record) => total + record.purchaseAmount, 0).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-green-600">共 {filteredPurchaseRecords.length} 筆購買記錄</p>
                    </div>

                    {/* 3. Display Filtered Records */}
                    {filteredPurchaseRecords.map((record) => (
                      <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{record.title}</h3>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            已購買
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">提出者：</span>
                            <span className="font-medium">{record.requester}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">購買金額：</span>
                            <span className="font-medium text-green-600">NT$ {record.purchaseAmount.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">需求日期：</span>
                            <span className="font-medium">{record.requestDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">購買日期：</span>
                            <span className="font-medium">{record.purchaseDate}</span>
                          </div>
                          {record.purchaserName && (
                            <div className="col-span-2">
                              <span className="text-gray-600">購買人：</span>
                              <span className="font-medium">{record.purchaserName}</span>
                            </div>
                          )}
                          {record.accountingCategory && (
                            <div className="col-span-2 sm:col-span-1"> {/* Display accounting category */}
                              <span className="text-gray-600">會計類別：</span>
                              <span className="font-medium">{record.accountingCategory}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Request Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              {/* Modal Header */}
              <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h2 className="text-lg font-semibold">新增採購需求</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-blue-600 p-1 rounded transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    需求標題
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="請輸入標題..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    詳細描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="請描述需求的詳細內容..."
                    rows="4"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    提出者姓名
                  </label>
                  <input
                    type="text"
                    value={formData.requester}
                    onChange={(e) => setFormData({...formData, requester: e.target.value})}
                    placeholder="請輸入您的姓名..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* New Accounting Category Input Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    會計類別 (選填)
                  </label>
                  <input
                    type="text"
                    value={formData.accountingCategory}
                    onChange={(e) => setFormData({...formData, accountingCategory: e.target.value})}
                    placeholder="請輸入會計科目或類別..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    提交需求
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comment Modal */}
        {isCommentModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"
            onClick={closeCommentModal} // Backdrop click to close
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 transform transition-all duration-300 ease-in-out scale-100"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">
                  發表留言於：<span className="font-bold">{currentRequestForComment?.title || '需求'}</span>
                </h2>
                <button
                  onClick={closeCommentModal} // Connected close button
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
                  title="關閉"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Form Body */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="commenterNameModal" className="block text-sm font-medium text-gray-700 mb-1">您的姓名*</label>
                  <input
                    id="commenterNameModal"
                    ref={commenterNameInputRef} // Assign ref
                    type="text"
                    value={commenterName}
                    onChange={(e) => setCommenterName(e.target.value)}
                    placeholder="請輸入您的姓名..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="newCommentModal" className="block text-sm font-medium text-gray-700 mb-1">留言內容*</label>
                  <textarea
                    id="newCommentModal"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="請輸入留言內容..."
                    rows="4"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Footer/Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
                <button
                  type="button"
                  onClick={closeCommentModal} // Connected cancel button
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentRequestForComment) {
                      addComment(currentRequestForComment.id);
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Send size={16} />
                  送出留言
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseRequestBoard;