import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "../../firebaseConfig";
import { getDocs, collection, query, where } from 'firebase/firestore';
import ClubSidebar from "@/components/sidebar/club";
import { useUserAuth } from "@/context/userAuthContext";
import '@uploadcare/react-uploader/core.css';
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ClubData {
  id: string; 
  club_name: string;
}

interface Event {
  id: string;
  event_title: string;
  event_date: string;
  event_club: string;
  event_points: number;
  expected_attendees: number;
  event_status: string;
}

interface ClubLayoutProps {
  children: React.ReactNode;
}

const ClubLayout: React.FC<ClubLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <ClubSidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
};

export { ClubLayout };

const ClubDashboard = () => {
  const { user } = useUserAuth();
  const [clubName, setClubName] = useState<string>("");
  const [clubId, setClubId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; participants: number }[]>([]);

  useEffect(() => {
    const fetchClubData = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const clubsRef = collection(db, 'CLUB');
      const q = query(clubsRef, where("club_email", "==", user.email));

      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const clubData = querySnapshot.docs[0].data() as ClubData;
          setClubName(clubData.club_name);
          setClubId(querySnapshot.docs[0].id);
        } else {
          setError("No club found for this email");
        }
      } catch (error) {
        console.error("Error fetching club data:", error);
        setError("Failed to fetch club data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubData();
  }, [user]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!clubId) return;

      const eventsRef = collection(db, 'EVENT');
      const q = query(eventsRef, where("club_id", "==", clubId));

      try {
        const querySnapshot = await getDocs(q);
        const fetchedEvents: Event[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Event));

        setEvents(fetchedEvents);

        // Generate 6-month analytics
        const monthlyAnalytics: { [key: string]: number } = {};
        const currentDate = new Date();
        fetchedEvents.forEach(event => {
          const eventDate = new Date(event.event_date);
          if (eventDate >= new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1)) {
            const monthKey = eventDate.toLocaleString('default', { month: 'short' });
            monthlyAnalytics[monthKey] = (monthlyAnalytics[monthKey] || 0) + event.expected_attendees;
          }
        });

        const analyticsData = Array.from({ length: 6 }, (_, i) => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
          const monthKey = date.toLocaleString('default', { month: 'short' });
          return { month: monthKey, participants: monthlyAnalytics[monthKey] || 0 };
        });

        setMonthlyData(analyticsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, [clubId]);

  return (
    <ClubLayout>
      <div className="p-6">
       
        <Card className="border-none shadow-none">
          <CardHeader>
            {isLoading ? (
              <CardTitle className="text-2xl font-semibold text-purple-800">
                Loading...
              </CardTitle>
            ) : error ? (
              <CardTitle className="text-2xl font-semibold text-red-600">
                {error}
              </CardTitle>
            ) : (
              <CardTitle className="text-2xl font-semibold text-purple-800">
                {clubName || "Club"} Dashboard
              </CardTitle>
            )}
          </CardHeader>

          <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Event Analytics</h1>

            {/* Event Selection */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Select Event</CardTitle>
              </CardHeader>
              <CardContent>
              <CardContent>
                <Select>
                  <SelectTrigger className="w-full">
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.event_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Events List with Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>All Events</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Participants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{event.event_title}</TableCell>
                        <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                        <TableCell>{event.expected_attendees}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 6-Month Participation Trend */}
            <Card>
              <CardHeader>
                <CardTitle>6-Month Participation Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-64">
                  <LineChart
                    width={800}
                    height={300}
                    data={monthlyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="participants"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </div>
              </CardContent>
            </Card>

            {/* Total Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Events Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {events.filter(event => event.event_status === "completed").length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {events.reduce((sum, event) => sum + event.expected_attendees, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Average Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {Math.round(
                      events.reduce((sum, event) => sum + event.expected_attendees, 0) / events.length || 0
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </Card>
      </div>
    </ClubLayout>
  );
};

export default ClubDashboard;
