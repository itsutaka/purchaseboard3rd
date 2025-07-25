import React from 'react';

const SidebarHeader = () => {
  return (
    <div className="flex items-center p-4 space-x-4">
      <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
      <h1 className="font-bold text-glory-red-700">BQ Grace Church</h1>
    </div>
  );
};

export default SidebarHeader;
