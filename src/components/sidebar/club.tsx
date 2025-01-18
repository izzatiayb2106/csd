//club sidebar 
import * as React from "react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { useUserAuth } from "@/context/userAuthContext";
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard,
  CalendarCheck, 
  FileText, 
  LogOut 
} from 'lucide-react';

const navItems = [
  {
    name: "Dashboard",
    link: "/club",
    icon: LayoutDashboard,
  },
  {
    name: "Attendance",
    link: "/clubAttendance",
    icon: CalendarCheck,
  },
  {
    name: "Proposal",
    link: "/clubProposal",
    icon: FileText,
  }
];


interface ClubSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const ClubSidebar: React.FC<ClubSidebarProps> = ({ isCollapsed, onToggle }) => {
  const { pathname } = useLocation();
  const { logOut } = useUserAuth();

  return (
    <div
      className={`fixed top-0 left-0 h-screen transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-24' : 'w-72'
      } bg-purple-50 border-r border-purple-100 shadow-lg`}
    >
      {/* Collapse Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 z-50 bg-purple-50 border border-purple-200 rounded-full p-1 hover:bg-purple-100"
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar Header */}
      <div className="flex justify-center py-8">
        <div
          className={`text-purple-800 text-xl font-semibold transition-opacity duration-200 ${
            isCollapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          Club Panel
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex flex-col flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              className={cn(
                buttonVariants({ variant: 'ghost' }),
                pathname === item.link
                  ? 'bg-purple-100 text-purple-900 hover:bg-purple-200'
                  : 'text-purple-700 hover:bg-purple-100 hover:text-purple-900',
                'justify-start py-3 px-4 transition-colors duration-150 rounded-lg'
              )}
            >
              <Link to={item.link} className="flex items-center w-full">
                <Icon
                  size={20}
                  className={`mr-3 ${
                    pathname === item.link ? 'opacity-90' : 'opacity-60'
                  }`}
                />
                <span
                  className={`font-medium transition-opacity duration-200 ${
                    isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-purple-100 mt-auto">
        <div
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            'text-purple-700 hover:bg-purple-100 hover:text-purple-900',
            'justify-start py-3 px-4 transition-colors duration-150 rounded-lg w-full'
          )}
        >
          <Link to="/login" className="flex items-center w-full" onClick={logOut}>
            <LogOut size={20} className="mr-3 opacity-60" />
            <span
              className={`font-medium transition-opacity duration-200 ${
                isCollapsed ? 'opacity-0 hidden' : 'opacity-100'
              }`}
            >
              Logout
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ClubSidebar;