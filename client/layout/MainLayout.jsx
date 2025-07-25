import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import SidebarTrigger from './SidebarTrigger';
import Backdrop from './Backdrop';
import ProfileMenu from '../ProfileMenu'; // Import ProfileMenu

const MainLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default to closed on mobile
  const triggerRef = useRef(null);
  const sidebarRef = useRef(null);

  // Focus trap logic remains the same
  useEffect(() => {
    if (isSidebarOpen) {
      const focusableElements = sidebarRef.current?.querySelectorAll(
        'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
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
      // Only auto-focus on mobile
      if (window.innerWidth < 768) {
        firstElement?.focus();
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (window.innerWidth < 768) {
            triggerRef.current?.focus();
        }
      };
    }
  }, [isSidebarOpen]);

  return (
    <div className="relative flex min-h-screen bg-gray-50">
      <Sidebar ref={sidebarRef} isSidebarOpen={isSidebarOpen} />
      
      <div className="flex-1 flex flex-col w-0"> {/* Use flex-1 and w-0 to ensure proper content wrapping */}
        <header className="sticky top-0 bg-white shadow-sm z-10 flex items-center justify-between p-2">
            <div ref={triggerRef}>
              <SidebarTrigger isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            </div>
            <div className="pr-2">
              <ProfileMenu />
            </div>
        </header>
        <main className="flex-1 p-4 overflow-y-auto"> {/* Allow content to scroll */}
          {children}
        </main>
      </div>

      {isSidebarOpen && <Backdrop onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default MainLayout;
