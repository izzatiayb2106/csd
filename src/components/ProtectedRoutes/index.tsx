import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { getAuth } from "firebase/auth";

interface IProtectedRoutesProps {}

const ProtectedRoutes: React.FunctionComponent<IProtectedRoutesProps> = () => {
  const auth = getAuth();
  const [user, loading] = useAuthState(auth);
  const location = useLocation();

  const adminEmails = ["admincsd@gmail.com"];
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = adminEmails.includes(user.email || "");
  const isClubAdmin = user.email?.endsWith("@club.usm.my") || false;
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isClubRoute = ["/club", "/clubProposal", "/clubAttendance", "/clubAnalytics"].some(
    path => location.pathname.startsWith(path)
  );

  if (isAdmin && !isAdminRoute && location.pathname !== "/") {
    return <Navigate to="/admin" replace />;
  }

  if (isClubAdmin && !isClubRoute && location.pathname !== "/") {
    return <Navigate to="/club" replace />;
  }

  if (!isAdmin && isAdminRoute) {
    return <Navigate to="/error" replace />;
  }

  if (!isClubAdmin && isClubRoute) {
    return <Navigate to="/error" replace />;
  }

  return <Outlet />;
};

export const AdminProtectedRoutes: React.FunctionComponent<IProtectedRoutesProps> = () => {
  const auth = getAuth();
  const [user, loading] = useAuthState(auth);

  const adminEmails = ["admincsd@gmail.com"];

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!adminEmails.includes(user.email || "")) {
    return <Navigate to="/error" replace />;
  }

  return <Outlet />;
};

export const ClubProtectedRoutes: React.FunctionComponent<IProtectedRoutesProps> = () => {
  const auth = getAuth();
  const [user, loading] = useAuthState(auth);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  const isClubAdmin = user.email?.endsWith("@club.usm.my") || false;
  
  if (!isClubAdmin) {
    return <Navigate to="/error" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;