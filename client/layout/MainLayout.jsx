import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import SidebarTrigger from './SidebarTrigger';
import Backdrop from './Backdrop';
import ProfileMenu from '../ProfileMenu'; // Import ProfileMenu

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  useEffect(() => {
    if (isSidebarOpen && isMobile) {
      const focusableElements = sidebarRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleKeyDown = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isSidebarOpen, isMobile]);

  useEffect(() => {
    if (!isSidebarOpen && isMobile) {
      triggerRef.current?.focus();
    }
  }, [isSidebarOpen, isMobile]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="flex-shrink-0 bg-white shadow-sm z-20 flex items-center justify-between p-2">
        <div ref={triggerRef}>
          <SidebarTrigger isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
        </div>
        <div className="pr-2">
          <ProfileMenu />
        </div>
      </header>

      {/* Main content area below header */}
      <div className={`relative flex flex-1 overflow-hidden ${!isMobile ? 'gap-6' : ''}`}>
        <Sidebar ref={sidebarRef} isSidebarOpen={isSidebarOpen} isMobile={isMobile} />
        
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      
      {isMobile && isSidebarOpen && <Backdrop onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default MainLayout;
