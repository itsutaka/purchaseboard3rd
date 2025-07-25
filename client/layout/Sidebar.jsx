import React, { forwardRef } from 'react';
import SidebarHeader from './SidebarHeader';
import SidebarContent from './SidebarContent';

const Sidebar = forwardRef(({ isSidebarOpen }, ref) => {
  return (
    <aside
      ref={ref}
      className={`fixed h-screen left-0 z-30 w-64 bg-white text-graphite-700 shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <SidebarHeader />
      <SidebarContent />
    </aside>
  );
});

export default Sidebar;
