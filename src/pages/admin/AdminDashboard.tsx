import * as React from "react";
import AdminSidebar from "@/components/sidebar/admin";
import { useState, useEffect } from "react";
import { Users, Calendar, Clock, Award } from "lucide-react";
import {BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer} from "recharts";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface Event {
  id: string;
  eventName: string;
  clubName: string;
  eventDate: string;
  status: string;
  eventPoints: number;
  participants?: string[];
  category?: string;
}

interface Stats {
  pendingEvents: number;
  totalEvents: number;
  activeUsers: number;
  totalPoints: number;
}

interface MonthlyData {
  month: string;
  events: number;
  points: number;
}

interface EventTypeData {
  name: string;
  value: number;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
};

export { AdminLayout };


const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    pendingEvents: 0,
    totalEvents: 0,
    activeUsers: 0,
    totalPoints: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [eventTypeData, setEventTypeData] = useState<EventTypeData[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch events data
        const eventsRef = collection(db, "SUCCESS_EVENTS");
        const eventsSnapshot = await getDocs(eventsRef);
        const events = eventsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Event[];

        // Calculate stats
        const pending = events.filter(
          (event) => event.status === "pending"
        ).length;
        const total = events.length;

        // Get student count from STUDENT collection
        const studentsRef = collection(db, "STUDENT");
        const studentsSnapshot = await getDocs(studentsRef);
        const studentCount = studentsSnapshot.size; // Use size instead of mapping

        // Calculate total points
        const totalPoints = events
          .filter((event) => event.status === "assigned")
          .reduce(
            (sum, event) => sum + event.eventPoints * (event.participants?.length ?? 0),
            0
          );

        setStats({
          pendingEvents: pending,
          totalEvents: total,
          activeUsers: studentCount,
          totalPoints: totalPoints,
        });

        // Process monthly data with proper date formatting
        const monthlyStats = processMonthlyData(events);
        setMonthlyData(monthlyStats);

        // Process event type data
        const typeStats = processEventTypeData(events);
        setEventTypeData(typeStats);

        // Get recent events
        const sortedEvents = [...events].sort(
          (a, b) =>
            new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        );
        setRecentEvents(sortedEvents.slice(0, 5));

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const processMonthlyData = (events: Event[]): MonthlyData[] => {
    const monthlyStats: { [key: string]: MonthlyData } = {};

    // Get current date for last 6 months data
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthYear = `${date.toLocaleString("default", {
        month: "short",
      })} ${date.getFullYear()}`;
      monthlyStats[monthYear] = { month: monthYear, events: 0, points: 0 };
    }

    events.forEach((event) => {
      if (!event.eventDate) return; // Skip if no date

      const date = new Date(event.eventDate);
      const monthYear = `${date.toLocaleString("default", {
        month: "short",
      })} ${date.getFullYear()}`;

      if (monthlyStats[monthYear]) {
        monthlyStats[monthYear].events += 1;
        if (event.status === "assigned") {
          monthlyStats[monthYear].points +=
            event.eventPoints * (event.participants?.length || 0);
        }
      }
    });

    // Convert to array and sort by date
    return Object.values(monthlyStats).reverse();
  };

  const processEventTypeData = (events: Event[]): EventTypeData[] => {
    const typeStats: { [key: string]: EventTypeData } = {};
    events.forEach((event) => {
      const category = event.category || "Uncategorized";
      if (!typeStats[category]) {
        typeStats[category] = { name: category, value: 0 };
      }
      typeStats[category].value += 1;
    });

    return Object.values(typeStats);
  };

  if (loading) {
    return (
      <AdminLayout>
      <div className="flex min-h-screen bg-gray-100">
        <main className="flex-1 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        </main>
      </div>
      </AdminLayout>
     
    );
  }

  return (
   <AdminLayout>
    <div className="flex min-h-screen bg-gray-100">
     
      <main className="flex-1 p-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
            <div className="flex gap-2">
              <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                <option>Last 6 months</option>
                <option>Last 12 months</option>
                <option>This Year</option>
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">
                    Pending Events
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {stats.pendingEvents}
                  </p>
                  <p className="text-yellow-600 text-sm mt-2">Requires Review</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <Clock className="text-yellow-500" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">
                    Total Events
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {stats.totalEvents}
                  </p>
                  <p className="text-green-600 text-sm mt-2">All Time Events</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <Calendar className="text-purple-500" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">
                    Active Users
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {stats.activeUsers}
                  </p>
                  <p className="text-green-600 text-sm mt-2">
                    Total Registered Users
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Users className="text-blue-500" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">
                    Total Points Awarded
                  </p>
                  <p className="text-3xl font-bold text-gray-800">
                    {stats.totalPoints}
                  </p>
                  <p className="text-green-600 text-sm mt-2">All Time Points</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <Award className="text-green-500" size={28} />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Monthly Overview</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="events"
                      fill="#8b5cf6"
                      name="Events"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="points"
                      fill="#10b981"
                      name="Points"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">
                Event Types Distribution
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                        name,
                      }) => {
                        const radius =
                          innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x =
                          cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                        const y =
                          cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {`${name} ${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventTypeData.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800">Recent Events</h2>
              <p className="text-gray-500 text-sm mt-1">
                Latest event proposals and their status
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Event Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Club
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4">{event.eventName}</td>
                      <td className="px-6 py-4">{event.clubName}</td>
                      <td className="px-6 py-4">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${
                            event.status === "assigned"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {event.status.charAt(0).toUpperCase() +
                            event.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">{event.eventPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

