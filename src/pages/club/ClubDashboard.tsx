import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db} from "../../firebaseConfig";
import { getDocs, collection, query, where } from 'firebase/firestore';
import ClubSidebar from "@/components/sidebar/club";
import { useUserAuth } from "@/context/userAuthContext";
import '@uploadcare/react-uploader/core.css';
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, TrendingUp } from "react-feather";

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

interface Participant {
  id: string;
  name: string;          
  stud_id: string;      
  timestamp: string;    
}

interface ClubLayoutProps {
  children: React.ReactNode;
}

const ClubLayout: React.FC<ClubLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <ClubSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ease-in-out p-8 flex-1 ${
          isCollapsed ? 'ml-24' : 'ml-72'
        }`}
      >
        {children}
      </main>
    </div>
  );
};

export { ClubLayout };

const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
}> = ({ title, value, icon }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-sm p-6"
  >
    <div className="flex items-center gap-4">
      <div className="p-3 bg-purple-100 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-purple-800">{value}</p>
      </div>
    </div>
  </motion.div>
);
const ClubDashboard = () => {
  const { user } = useUserAuth();
  const [clubName, setClubName] = useState<string>("");
  const [clubId, setClubId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; participants: number }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isParticipantsDialogOpen, setIsParticipantsDialogOpen] = useState(false);
  const [selectedEventParticipants, setSelectedEventParticipants] = useState<Participant[]>([]);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");

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

      const eventsRef = collection(db, 'EVENTS');
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

  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId);
  };

  const handleEventNameClick = async (eventId: string, eventTitle: string) => {
    try {
      console.log('Fetching participants for event:', eventId);
      const attendeesRef = collection(db, 'EVENTS', eventId, 'ATTENDEES');
      const querySnapshot = await getDocs(attendeesRef);
      
      const participants = querySnapshot.docs.map(doc => {
        const attendanceData = doc.data();
        return {
          id: doc.id,
          name: attendanceData.name || 'Unknown',
          stud_id: attendanceData.stud_id || 'Unknown',
          timestamp: attendanceData.timestamp?.toDate().toLocaleString() || 'Unknown'
        } as Participant;
      });

      console.log('Fetched participants:', participants);
      setSelectedEventParticipants(participants);
      setSelectedEventTitle(eventTitle);
      setIsParticipantsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching participants:", error);
      setSelectedEventParticipants([]);
      setSelectedEventTitle(eventTitle);
      setIsParticipantsDialogOpen(true);
    }
  };

  return (
    <ClubLayout>
      <div className="p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
        <Card className="border-none shadow-none">
          <CardHeader className="pb-2">
            {isLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <CardTitle className="text-2xl font-semibold text-red-600">
                  {error}
                </CardTitle>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <CardTitle className="text-3xl font-bold text-purple-800">
                  {clubName || "Club"} Dashboard
                </CardTitle>
                <Badge variant="outline" className="text-purple-600">
                  {events.length} Events
                </Badge>
              </div>
            )}
          </CardHeader>

          <div className="p-6 space-y-8">
            {/* Stats Section */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <StatCard
                title="Total Events Completed"
                value={events.filter(event => event.event_status === "completed").length}
                icon={<CheckCircle className="h-6 w-6 text-purple-600" />}
              />
              <StatCard
                title="Total Participants"
                value={events.reduce((sum, event) => sum + event.expected_attendees, 0)}
                icon={<Users className="h-6 w-6 text-purple-600" />}
              />
              <StatCard
                title="Average Participants"
                value={Math.round(
                  events.reduce((sum, event) => sum + event.expected_attendees, 0) / events.length || 0
                )}
                icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
              />
            </motion.div>

            {/* Event Selection Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-purple-50 to-white">
                <CardHeader>
                  <CardTitle>Select Event</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select onValueChange={handleEventSelect} value={selectedEventId || undefined}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.event_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Event Details Section */}
                  {selectedEventId && events.find(event => event.id === selectedEventId) && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3">Event Details</h3>
                      {(() => {
                        const event = events.find(e => e.id === selectedEventId)!;
                        return (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Event Title</p>
                              <p className="font-medium">{event.event_title}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Date</p>
                              <p className="font-medium">
                                {new Date(event.event_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Status</p>
                              <p className="font-medium capitalize">{event.event_status}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Points</p>
                              <p className="font-medium">{event.event_points}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Expected Attendees</p>
                              <p className="font-medium">{event.expected_attendees}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Club</p>
                              <p className="font-medium">{event.event_club}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Events List Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="overflow-hidden border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-100 to-purple-50">
                  <CardTitle className="text-xl font-semibold text-purple-800">
                    All Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
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
                            <TableCell>
                              <button
                                onClick={() => handleEventNameClick(event.id, event.event_title)}
                                className="text-blue-600 hover:underline text-left"
                              >
                                {event.event_title}
                              </button>
                            </TableCell>
                            <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                            <TableCell>{event.expected_attendees}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Analytics Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="bg-gradient-to-br from-purple-50 to-white">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-purple-800">
                    Participation Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="participants"
                          stroke="#7c3aed"
                          strokeWidth={2}
                          dot={{ fill: "#7c3aed" }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </Card>

        <Dialog open={isParticipantsDialogOpen} onOpenChange={setIsParticipantsDialogOpen}>
      <DialogContent className="max-w-4xl bg-gradient-to-br from-white to-purple-50">
        <DialogHeader>
          <DialogTitle>Participants for {selectedEventTitle}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Attendance Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedEventParticipants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    No participants found
                  </TableCell>
                </TableRow>
              ) : (
                selectedEventParticipants.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>{participant.name}</TableCell>
                    <TableCell>{participant.stud_id}</TableCell>
                    <TableCell>{participant.timestamp}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
        </motion.div>
      </div>
    </ClubLayout>
  );
};
export default ClubDashboard;
