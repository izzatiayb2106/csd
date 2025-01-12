import React, { useState, useEffect } from "react";
import {BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,Tooltip,Legend,ResponsiveContainer,} from "recharts";
import { Clock, Target, Calendar as CalendarIcon,  CheckCircle2, ChevronRight, Activity, LayoutDashboard, X, ChevronLeft,} from "lucide-react";
import { collection, getDocs, DocumentReference, query, where, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import Layout from "@/components/layout";

// Updated interfaces to match Firebase structure
interface Event {
  id?: string;
  ATTENDEES?: string[];
  completedAt: { seconds: number; nanoseconds: number };
  event_cat: string;
  event_club: string;
  event_date: string;
  event_desc: string;
  event_points: number;
  event_status: string;
  event_title: string;
  expected_attendees: number;
  pdf_url: string;
  point_status: string;
  proposal_date: { seconds: number; nanoseconds: number };
  qr_code_link: string;
  mycsd_point: number;
  mycsd_status: string;
}

interface Student {
  stud_email: string;
  stud_matrics: number;
  stud_name: string;
  stud_pwd: string;
}

interface MycsdPoint {
  event_ID: DocumentReference;
  mycsd_point: number;
  mycsd_status: string;
  student_ID: DocumentReference;
}

const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
};

interface CalendarViewProps {
  onDateSelect: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const weeks = [];
  let week = new Array(7).fill(null);
  let dayCounter = 1;

  for (let i = firstDayOfMonth; i < 7; i++) {
    week[i] = dayCounter++;
  }
  weeks.push([...week]);

  week = new Array(7).fill(null);
  while (dayCounter <= daysInMonth) {
    for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
      week[i] = dayCounter++;
    }
    weeks.push([...week]);
    week = new Array(7).fill(null);
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 w-full">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
            )
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-semibold">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
            )
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-medium p-2">
            {day}
          </div>
        ))}
        {weeks.map((week, i) =>
          week.map((day, j) => (
            <div
              key={`${i}-${j}`}
              className={`text-center p-2 cursor-pointer hover:bg-pink-50 rounded ${
                day ? "hover:bg-pink-100" : ""
              }`}
              onClick={() =>
                day &&
                onDateSelect(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    day
                  )
                )
              }
            >
              {day}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const PointTrackingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [events, setEvents] = useState<Event[]>([]);
  const [mycsdPoints, setMycsdPoints] = useState<MycsdPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [goalPoints, setGoalPoints] = useState(100);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const auth = getAuth();
  const COLORS = ["#afeeee", "#ffa07a"];

  const progressData = [
    { name: "Completed", value: totalPoints },
    { name: "Remaining", value: Math.max(0, goalPoints - totalPoints) },
  ];

  const fetchData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No current user");
        setLoading(false);
        return;
      }

      console.log("Current user email:", currentUser.email);

      const studentsRef = collection(db, "STUDENT");
      const studentQuery = query(studentsRef, where("stud_email", "==", currentUser.email));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (!studentSnapshot.empty) {
        const studentDoc = studentSnapshot.docs[0];
        const studentRef = studentDoc.ref;
        const studentData = studentDoc.data() as Student;
        
        console.log("Found student:", studentData);

        const mycsdRef = collection(db, "MYCSD");
        const mycsdQuery = query(mycsdRef, where("student_ID", "==", studentRef));
        const mycsdSnapshot = await getDocs(mycsdQuery);

        const mycsdData = mycsdSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as MycsdPoint & { id: string }));

        console.log("Found MYCSD points:", mycsdData);

        const eventPromises = mycsdData.map(async point => {
          try {
            const eventDoc = await getDoc(point.event_ID);
            if (eventDoc.exists()) {
              const eventData = eventDoc.data();
              console.log("Found event:", eventData);
              return {
                ...eventData,
                id: eventDoc.id,
                mycsd_point: point.mycsd_point,
                mycsd_status: point.mycsd_status
              };
            }
            return null;
          } catch (error) {
            console.error("Error fetching event:", error);
            return null;
          }
        });

        const eventsData = (await Promise.all(eventPromises))
          .filter(event => event !== null) as Event[];

        console.log("Final events data:", eventsData);

        setEvents(eventsData);
        setMycsdPoints(mycsdData);

        const total = mycsdData.reduce((sum, point) => sum + point.mycsd_point, 0);
        setTotalPoints(total);
        console.log("Total points:", total);
      } else {
        console.log("No student found for email:", currentUser.email);
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.currentUser]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    // Filter events by selected date
    const selectedDateStr = date.toISOString().split('T')[0];
    const filteredEvents = events.filter(
      (event) => event.event_date === selectedDateStr
    );
    // Additional logic for filtered events can be added here
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex-1 bg-pink-100 flex items-center justify-center min-h-screen">
          <div className="text-pink-600 text-xl">Loading...</div>
        </div>
      </Layout>
    );
  }

  const getUpcomingEvents = () => {
    const today = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate >= today && event.mycsd_status !== 'completed';
    }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  };

  const getRecentEvents = () => {
    const today = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      return eventDate <= today || event.mycsd_status === 'completed';
    }).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  };

  return (
    <Layout>
      <div className="flex-1 bg-pink-50 p-8 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`${
                  activeTab === "overview" ? "text-pink-600" : "text-gray-600"
                }`}
              >
                CSDS
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`${
                  activeTab === "history" ? "text-pink-600" : "text-gray-600"
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`${
                  activeTab === "events" ? "text-pink-600" : "text-gray-600"
                }`}
              >
                Events
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center text-pink-600"
              >
                <CalendarIcon className="mr-2" size={20} />
                <span>
                  {selectedDate.toLocaleDateString("default", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </button>
              {showCalendar && (
                <div className="absolute top-full right-0 mt-2 z-50">
                  <div className="max-w-md">
                    <CalendarView onDateSelect={handleDateSelect} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {activeTab === "overview" && (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <h2 className="text-lg font-semibold mb-4">This Semester</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-pink-100 p-4 rounded-md text-center">
                  <div className="text-4xl font-bold text-pink-600">
                    {totalPoints}
                  </div>
                  <div className="text-gray-500">Total Points</div>
                </div>
                <div className="bg-pink-100 p-4 rounded-md text-center">
                  <div className="text-4xl font-bold text-pink-600">
                    {goalPoints}
                  </div>
                  <div className="text-gray-500">Goal Points</div>
                </div>
                <div className="bg-pink-100 p-4 rounded-md text-center">
                  <div className="text-4xl font-bold text-pink-600">
                    {Math.round((totalPoints / goalPoints) * 100)}%
                  </div>
                  <div className="text-gray-500">Progress</div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={progressData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {progressData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <h3 className="font-semibold text-pink-600 mb-2">
                  Recent Activity
                </h3>
                {getRecentEvents().slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className="flex justify-between items-center py-2 border-b"
                  >
                    <div>{event.event_title}</div>
                    <div className="text-sm text-gray-500">
                      {event.mycsd_point} Points
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">History</h2>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-2">Event Title</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Points</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getRecentEvents().map((event) => (
                    <tr
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="p-2">{event.event_title}</td>
                      <td className="p-2">{event.event_cat}</td>
                      <td className="p-2">{event.event_points}</td>
                      <td className="p-2">{event.event_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "events" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getUpcomingEvents().map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50" onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium">{event.event_title}</div>
                      <div className="text-sm text-gray-500">{event.event_date}</div>
                      <div className="mt-2 text-pink-600">
                        {event.event_points} Points
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {event.event_cat}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 truncate">
                        {event.event_desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
    
            <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)}>
              {selectedEvent && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">{selectedEvent.event_title}</h2>
                  <div>
                    <div className="text-sm text-gray-500">Category</div>
                    <div>{selectedEvent.event_cat}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Club</div>
                    <div>{selectedEvent.event_club}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date</div>
                    <div>{selectedEvent.event_date}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Points</div>
                    <div>{selectedEvent.event_points}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Status</div>
                    <div>{selectedEvent.event_status}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Description</div>
                    <div>{selectedEvent.event_desc}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Expected Attendees</div>
                    <div>{selectedEvent.expected_attendees}</div>
                  </div>
                  {selectedEvent.pdf_url && (
                    <div>
                      <div className="text-sm text-gray-500">Additional Information</div>
                      <a 
                        href={selectedEvent.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700"
                      >
                        View PDF
                      </a>
                    </div>
                  )}
                  {selectedEvent.completedAt && (
                    <div>
                      <div className="text-sm text-gray-500">Completed At</div>
                      <div>
                        {new Date(selectedEvent.completedAt.seconds * 1000).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Modal>
          </div>
        </div>
      </Layout>
    );
  };
  
  export default PointTrackingPage;