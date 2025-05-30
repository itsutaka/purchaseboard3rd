import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'; // Added useCallback
import { Plus, MessageCircle, Edit, Trash2, X, Send, Calendar, User, RotateCcw, Receipt, DollarSign } from 'lucide-react';

const PurchaseRequestBoard = () => {
  const commenterNameInputRef = useRef(null); // Create ref for commenter name input in modal

  const [requests, setRequests] = useState([
    {
      id: 1,
      title: '辦公桌',
      description: '需要兩張可調高度的辦公桌，供新進同仁使用',
      requester: '王小明',
      status: 'pending',
      date: '2025-05-26',
      comments: []
    },
    {
      id: 2,
      title: '藍牙鍵盤',
      description: '辦公室需要新的藍牙鍵盤，最好是可以多設備切換的類型',
      requester: '李小華',
      status: 'pending',
      date: '2025-05-25',
      comments: [
        { id: 1, author: '張經理', content: '已經找到合適的型號了', date: '2025-05-25' }
      ]
    },
    {
      id: 3,
      title: '投影機',
      description: '會議室需要一台新的投影機，目前的已經故障無法使用',
      requester: '王小明',
      status: 'purchased',
      date: '2025-05-24',
      purchaseAmount: 12000,
      purchaseDate: '2025-05-26',
      purchaserName: '未知', // Added placeholder
      comments: []
    }
  ]);
  
  const [purchaseRecords, setPurchaseRecords] = useState([
    {
      id: 3,
      title: '投影機',
      requester: '王小明',
      purchaseAmount: 12000,
      requestDate: '2025-05-24',
      purchaseDate: '2025-05-26',
      purchaserName: '未知' // Added placeholder
    }
  ]);

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

  // 1. Add new state variables for filters:
  const [filterPurchaserName, setFilterPurchaserName] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requester: ''
  });

  const statusLabels = {
    'pending': { text: '待購買', color: 'bg-yellow-100 text-yellow-800' },
    'purchased': { text: '已購買', color: 'bg-green-100 text-green-800' }
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.requester.trim()) {
      return;
    }
    
    const newRequest = {
      id: requests.length + 1,
      ...formData,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      comments: []
    };
    setRequests([newRequest, ...requests]);
    setFormData({ title: '', description: '', requester: '' });
    setShowModal(false);
  };

  const updateStatus = (id, newStatus) => {
    if (newStatus === 'purchased') {
      setSelectedRequestId(id);
      setShowPurchaseModal(true);
    } else {
      setRequests(requests.map(req => 
        req.id === id ? { ...req, status: newStatus, purchaseAmount: undefined, purchaseDate: undefined } : req
      ));
      // 從購買記錄中移除
      setPurchaseRecords(records => records.filter(record => record.id !== id));
    }
  };

  const confirmPurchase = () => {
    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      alert('請輸入有效的購買金額');
      return;
    }
    // 3. Modify confirmPurchase function: Add validation for purchaser name
    if (!purchaserNameInput.trim()) {
      alert('請輸入購買人姓名');
      return;
    }

    const purchaseDate = new Date().toISOString().split('T')[0];
    const updatedRequest = requests.find(req => req.id === selectedRequestId);
    
    // 更新請求狀態
    setRequests(requests.map(req => 
      req.id === selectedRequestId 
        ? { 
            ...req, 
            status: 'purchased', 
            purchaseAmount: parseFloat(purchaseAmount),
            purchaseDate: purchaseDate,
            purchaserName: purchaserNameInput // 3. Modify confirmPurchase function: Add purchaserName to requests state
          }
        : req
    ));

    // 新增到購買記錄
    const newRecord = {
      id: selectedRequestId,
      title: updatedRequest.title,
      requester: updatedRequest.requester,
      purchaseAmount: parseFloat(purchaseAmount),
      requestDate: updatedRequest.date,
      purchaseDate: purchaseDate,
      purchaserName: purchaserNameInput // 3. Modify confirmPurchase function: Add purchaserName to purchaseRecords state
    };

    setPurchaseRecords(prev => [...prev, newRecord]);
    
    // 清理狀態
    setPurchaseAmount('');
    setPurchaserNameInput(''); // 3. Modify confirmPurchase function: Reset purchaserNameInput
    setSelectedRequestId(null);
    setShowPurchaseModal(false);
  };

  const deleteRequest = (id) => {
    const confirmed = window.confirm("您確定要刪除此採購需求嗎？相關的購買記錄和留言也會一併移除。");

    if (confirmed) {
      setRequests(prevRequests => prevRequests.filter(req => req.id !== id));
      setPurchaseRecords(prevRecords => prevRecords.filter(record => record.id !== id)); // Added this line
    }
    // If not confirmed, the function does nothing further
  };

  const addComment = (requestId) => {
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
    
    const comment = {
      id: Date.now(),
      author: trimmedName, // Use commenterName from state
      content: trimmedComment, // Use trimmed comment
      date: new Date().toISOString().split('T')[0]
    };

    setRequests(requests.map(req => 
      req.id === requestId 
        ? { ...req, comments: [...req.comments, comment] }
        : req
    ));
    
    setNewComment(''); // Reset comment content
    setCommenterName(''); // Reset commenter name
    closeCommentModal(); // Added this line
  };

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
                onClick={() => setShowRecordsModal(true)}
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
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                    <User size={16} />
                    <span>提出者：{request.requester} • {request.date}</span>
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
                    留言 ({request.comments.length}) {/* Show comment count */}
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
                    onClick={() => deleteRequest(request.id)}
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
                <button
                  onClick={() => setShowRecordsModal(false)}
                  className="text-white hover:bg-green-600 p-1 rounded transition-colors"
                >
                  <X size={20} />
                </button>
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