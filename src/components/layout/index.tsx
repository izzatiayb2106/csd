import * as React from "react";
import Sidebar from "../sidebar";
import AdminSidebar from "../sidebar/admin";
import ClubSidebar from "../sidebar/club";
import { useUserAuth } from "../../context/userAuthContext";
import { Loader2, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

interface ILayoutProps {
  children: React.ReactNode;
}

const Layout: React.FunctionComponent<ILayoutProps> = ({ children }) => {
  const { user, loading } = useUserAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      setIsMobile(width < 768);
      setIsSidebarOpen(width >= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const renderSidebar = () => {
    if (!user) return <Sidebar />;
    switch (user.role) {
      case "admin":
        return <AdminSidebar />;
      case "club":
        return <ClubSidebar />;
      case "student":
      default:
        return <Sidebar />;
    }
  };

  const sidebarWidth = isMobile ? "100%" : "240px";
  const mainWidth = isMobile
    ? "100%"
    : `calc(100% - ${isSidebarOpen ? sidebarWidth : "0px"})`;

  return (
    <div className="flex min-h-screen bg-white relative overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <div
        style={{ width: sidebarWidth }}
        className={`
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          fixed md:relative
          top-0 left-0 h-full
          z-40
          transition-all duration-300 ease-in-out
          md:translate-x-0
        `}
      >
        {renderSidebar()}
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        style={{ width: mainWidth }}
        className={`
          transition-all duration-300 ease-in-out
          p-4 md:p-8
          flex flex-col
          relative
          min-h-screen
          overflow-x-hidden
        `}
      >
        <div className="w-full max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
