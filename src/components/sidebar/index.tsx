import * as React from "react";
import { useState } from "react";
import homeIcon from "@/assets/icons/home.svg";
import addIcon from "@/assets/icons/add.svg";
//import directIcon from "@/assets/icons/direct.svg";
import logoutIcon from "@/assets/icons/logout.svg";
import settingsIcon from "@/assets/icons/settings.svg";
import notificationIcon from "@/assets/icons/notification.svg";
import profileIcon from "@/assets/icons/profile.svg";
//import eventIcon from "@/assets/icons/event.svg";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "../ui/button";
import { useUserAuth } from "@/context/userAuthContext";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ISidebarProps {}

const navItems = [
  {
    name: "Home",
    link: "/",
    icon: homeIcon,
  },
  {
    name: "Goal Setting",
    link: "/GoalSetting",
    icon: addIcon,
  },
  {
    name: "Point Tracking",
    link: "/pointtracking",
    icon: profileIcon,
  },
  {
    name: "Notifications",
    link: "#",
    icon: notificationIcon,
  },

  {
    name: "Settings",
    link: "#",
    icon: settingsIcon,
  },
];

const Sidebar: React.FunctionComponent<ISidebarProps> = () => {
  const { pathname } = useLocation();
  const { logOut } = useUserAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-50 bg-purple-50 border border-purple-200 rounded-full p-1 hover:bg-purple-100"
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      <nav className={`flex flex-col relative h-screen transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-24' : 'w-72'} bg-purple-50 border-r border-purple-100`}
      >
        <div className="flex justify-center py-8">
          <div className={`text-purple-800 text-xl font-semibold transition-opacity duration-200
            ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>
            CSD+
          </div>
        </div>
        <div className="flex flex-col flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <div
              className={cn(
                buttonVariants({ variant: "ghost" }),
                pathname === item.link
                  ? "bg-purple-100 text-purple-900 hover:bg-purple-200"
                  : "text-purple-700 hover:bg-purple-100 hover:text-purple-900",
                "justify-start py-3 px-4 transition-colors duration-150 rounded-lg"
              )}
              key={item.name}
            >
              <Link to={item.link} className="flex items-center w-full">
                <span>
                  <img
                    src={item.icon}
                    className="w-5 h-5 mr-3"
                    alt={item.name}
                    style={{
                      filter: "brightness(0) saturate(100%)",
                      opacity: pathname === item.link ? "0.9" : "0.6",
                    }}
                  />
                </span>
                <span className={`font-medium transition-opacity duration-200
                  ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                  {item.name}
                </span>
              </Link>
            </div>
          ))}
        </div>
        <div className="px-3 py-4 border-t border-purple-100">
          <div
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-purple-700 hover:bg-purple-100 hover:text-purple-900",
              "justify-start py-3 px-4 transition-colors duration-150 rounded-lg w-full"
            )}
          >
            <Link to="/login" className="flex items-center w-full" onClick={logOut}>
              <span>
                <img
                  src={logoutIcon}
                  className="w-5 h-5 mr-3"
                  alt="Logout"
                  style={{
                    filter: "brightness(0) saturate(100%)",
                    opacity: "0.6",
                  }}
                />
              </span>
              <span className={`font-medium transition-opacity duration-200
                ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                Logout
              </span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;