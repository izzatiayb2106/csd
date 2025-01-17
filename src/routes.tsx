import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Home from "./pages/home/StudentDasboard";
import ClubDashboard from "./pages/club/ClubDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import EventProposals from "./pages/admin/EventProposals";
import ProtectedRoutes, { AdminProtectedRoutes, ClubProtectedRoutes } from "./components/ProtectedRoutes";
import Error from "./pages/error";
import EventProposal from "./pages/club/ClubProposal";
import EventAttendance from "./pages/club/ClubAttendance";
import PointTrackingPage from "./pages/pointtracking/pointTracking";
import PointAllocation from "./pages/admin/PointAllocation";
import GoalSetting from "./pages/goal/goalSetting";
import EventAttendanceScanner from "./pages/event-attendance/[eventId]";

export const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: <Login />,
    errorElement: <Error />,
  },
  {
    path: "/signup",
    element: <Signup />,
    errorElement: <Error />,
  },
  
  
  // Protected regular user routes
  {
    element: <ProtectedRoutes />,
    errorElement: <Error />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/pointTracking",
        element: <PointTrackingPage />,
      },
      {
        path: "/goalSetting",
        element: <GoalSetting />,
      },
      {
        path: "/event-attendance/:eventId",
        element: <EventAttendanceScanner />,
      },
    ],
  },

  // Protected club admin routes
  {
    element: <ClubProtectedRoutes />,
    errorElement: <Error />,
    children: [
      {
        path: "/club",
        element: <ClubDashboard/>,
      },
      {
        path: "/clubProposal",
        element: <EventProposal />,
      },
      {
        path: "/clubAttendance",
        element: <EventAttendance />,
      },
    
    ],
  },

  // Protected admin routes
  {
    element: <AdminProtectedRoutes />,
    errorElement: <Error />,
    children: [
      {
        path: "/admin",
        element: <AdminDashboard />,
      },
      {
        path: "/EventProposals",
        element: <EventProposals />,
      },
      {
        path: "/pointAllocation",
        element: <PointAllocation />,
      }
    ],
  },
  
]);


export default router;

