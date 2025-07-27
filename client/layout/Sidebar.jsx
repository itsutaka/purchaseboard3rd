import React, { forwardRef } from 'react';
import SidebarHeader from './SidebarHeader';
import SidebarContent from './SidebarContent';

const Sidebar = forwardRef(({ isSidebarOpen, isMobile }, ref) => {
  const isActuallyHidden = !isSidebarOpen && isMobile;

  return (
    <>
      <div
        ref={ref}
        className={`
          flex flex-col bg-white text-graphite-700 rounded-lg 
          transition-transform duration-300 ease-in-out
          ${isMobile
            ? `fixed top-0 bottom-0 left-0 z-30 w-full max-w-xs transform ${isSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'}`
            : 'static w-64 shadow-sm mt-6'
          }
        `}
        aria-hidden={isActuallyHidden}
        {...(isActuallyHidden ? { inert: 'true' } : {})}
      >
        <SidebarHeader />
        <SidebarContent />
      </div>
    </>
  );
});

export default Sidebar;
