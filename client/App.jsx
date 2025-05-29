import React from 'react';
import PurchaseRequestBoard from './PurchaseRequestBoard.jsx';
import './App.css'; // Assuming this is for non-Tailwind global styles if needed

function App() {
  return (
    <React.StrictMode>
      <div className="bg-blue-100 min-h-screen p-4"> {/* Added Tailwind classes */}
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Purchase Board App (Tailwind Test)</h1> {/* Added a test heading */}
        <PurchaseRequestBoard />
      </div>
    </React.StrictMode>
  );
}

export default App;
