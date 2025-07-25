import React from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const SidebarTrigger = ({ isSidebarOpen, setIsSidebarOpen }) => {
  return (
    <button 
      onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
      className="p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-glory-red-500 md:hidden"
    >
      {isSidebarOpen ? (
        <XMarkIcon className="h-6 w-6" />
      ) : (
        <Bars3Icon className="h-6 w-6" />
      )}
    </button>
  );
};

export default SidebarTrigger;
