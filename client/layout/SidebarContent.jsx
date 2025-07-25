import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChartBarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const navigationLinks = [
  { to: '/purchase', text: '採購看板', icon: ChartBarIcon },
  { to: '/tithing', text: '奉獻計算', icon: CurrencyDollarIcon },
];

const SidebarContent = () => {
  return (
    <nav className="flex-1 px-2 py-4 space-y-1">
      <ul>
        {navigationLinks.map((link, index) => (
          <li key={index}>
            <NavLink 
              to={link.to} 
              className={({ isActive }) =>
                `flex items-center space-x-2 p-2 rounded-md ${
                  isActive ? 'bg-glory-red-500 text-white' : 'text-graphite-700 hover:bg-glory-red-50 hover:text-glory-red-700'
                }`
              }
            >
              <link.icon className="h-6 w-6" />
              <span>{link.text}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SidebarContent;
