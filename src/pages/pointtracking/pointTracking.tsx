import React, { useState, useEffect } from "react";
import {  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {  X, Trophy, Target, Calendar } from "lucide-react";
import { collection, getDocs, DocumentReference, query, where, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import Layout from "@/components/layout";
import Select from 'react-select';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

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

interface MycsdPoint {
  event_id: DocumentReference;
  mycsd_point: number;
  mycsd_status: string;
  stud_id: DocumentReference;
}

interface Goal {
  completed: boolean;
  createdAt: { seconds: number; nanoseconds: number };
  goal_points: number;
  goal_title: string;
  goal_type: string;
  semester: string;
  stud_id: DocumentReference;
}

const ProgressMessage: React.FC<{ percentage: number }> = ({ percentage }) => {
  const getMessage = () => {
    if (percentage >= 100) return {
      title: "Outstanding Achievement! 🎉",
      message: "Congratulations! Let's step up your game next time!",
      color: "bg-purple-100 text-purple-800"
    };
    if (percentage >= 80) return {
      title: "Almost There! 💪",
      message: "You're so close to reaching your goal. Fighting!",
      color: "bg-purple-200 text-purple-800"
    };
    if (percentage >= 50) return {
      title: "Halfway Mark! 🎯",
      message: "You're literally halfway there! Keep up the great work!",
      color: "bg-purple-300 text-purple-800"
    };
    return {
      title: "Starting Your Journey! 🚀",
      message: "Let's strive to participate in more events!",
      color: "bg-purple-400 text-purple-800"
    };
  };

  const messageData = getMessage();

  return (
    <Alert className={`${messageData.color} border-none mb-4`}>
      <AlertTitle className="font-bold">{messageData.title}</AlertTitle>
      <AlertDescription>{messageData.message}</AlertDescription>
    </Alert>
  );
};

const ProgressStats: React.FC<{
  events: Event[];
  totalPoints: number;
  goalPoints: number;
}> = ({ events, totalPoints, goalPoints }) => {
  const getActiveMonth = () => {
    const monthPoints = events.reduce((acc, event) => {
      if (event.point_status === 'assigned') {
        const month = new Date(event.event_date).getMonth();
        acc[month] = (acc[month] || 0) + event.event_points;
      }
      return acc;
    }, {} as { [key: number]: number });

    if (Object.keys(monthPoints).length === 0) return "No events yet";

    const maxMonth = Object.entries(monthPoints).reduce((a, b) => 
      b[1] > a[1] ? b : a
    )[0];

    return new Date(0, parseInt(maxMonth)).toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div className="flex items-center space-x-2 text-purple-600">
        <Calendar className="h-5 w-5" />
        <span className="font-semibold">Most Active Month:</span>
        <span>{getActiveMonth()}</span>
      </div>
      
      <div className="flex items-center space-x-2 text-purple-600">
        <Target className="h-5 w-5" />
        <span className="font-semibold">Current Progress:</span>
        <span>{Math.round((totalPoints / goalPoints) * 100)}%</span>
      </div>
      
      <div className="flex items-center space-x-2 text-purple-600">
        <Trophy className="h-5 w-5" />
        <span className="font-semibold">Points to Goal:</span>
        <span>{Math.max(0, goalPoints - totalPoints)} points remaining</span>
      </div>
    </div>
  );
};

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

const PointTrackingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [events, setEvents] = useState<Event[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [goalPoints, setGoalPoints] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tempSearchTerm, setTempSearchTerm] = useState("");

  const auth = getAuth();
  const COLORS = ["#6a0dad", "#d8bfd8"];

  const progressData = [
    { name: "Completed", value: totalPoints },
    { name: "Remaining", value: Math.max(0, goalPoints - totalPoints) },
  ];

  const fetchData = async () => {
    try {
      setError(null);
      setIsLoadingEvents(true);
      setIsLoadingGoals(true);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("No user logged in");
        return;
      }

      const studentsRef = collection(db, "STUDENT");
      const studentQuery = query(studentsRef, where("stud_email", "==", currentUser.email));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (studentSnapshot.empty) {
        setError("No student found for this account");
        return;
      }

      const studentDoc = studentSnapshot.docs[0];
      const studentRef = studentDoc.ref;

      // Fetch goals
      try {
        const goalsRef = collection(db, "GOALS");
        const goalQuery = query(
          goalsRef,
          where("stud_id", "==", studentRef),
          where("goal_type", "==", "long-term")
        );
        const goalSnapshot = await getDocs(goalQuery);

        if (!goalSnapshot.empty) {
          const goalData = goalSnapshot.docs[0].data() as Goal;
          setGoalPoints(goalData.goal_points);
        }
      } catch (error) {
        console.error("Error fetching goals:", error);
        setError("Failed to load goals");
      } finally {
        setIsLoadingGoals(false);
      }

      // Fetch events
      try {
        const mycsdRef = collection(db, "MYCSD");
        const mycsdQuery = query(
          mycsdRef, 
          where("stud_id", "==", studentRef)
        );
        const mycsdSnapshot = await getDocs(mycsdQuery);

        const mycsdData = mycsdSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as MycsdPoint & { id: string }));

        const eventPromises = mycsdData.map(async point => {
          try {
            const eventDoc = await getDoc(point.event_id);
            if (eventDoc.exists()) {
              const eventData = eventDoc.data();
              return {
                ...eventData,
                id: eventDoc.id,
                mycsd_point: eventData.event_points,
                mycsd_status: eventData.point_status,
                point_status: eventData.point_status
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

        setEvents(eventsData);

        const total = eventsData.reduce((sum, event) => 
          event.point_status === 'assigned' ? sum + event.event_points : sum, 0);
        setTotalPoints(total);
      } catch (error) {
        console.error("Error fetching events:", error);
        setError("Failed to load events");
      } finally {
        setIsLoadingEvents(false);
      }

    } catch (error) {
      console.error("Error in fetchData:", error);
      setError("Something went wrong");
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth.currentUser]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Get unique categories from events
  const categories = [...new Set(events.map(event => event.event_cat))];
  const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));

  // Filter and sort events
  const filterEvents = () => {
    let filteredEvents = getHistoryEvents();
    return filteredEvents.filter(event => {
      const matchesSearch = event.event_title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || event.event_cat === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const FilterControls = () => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    return (
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search events..."
              className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={tempSearchTerm}
              onChange={(e) => setTempSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchTerm(tempSearchTerm);
                  inputRef.current?.blur();
                }
              }}
              ref={inputRef}
            />
            <button
              onClick={() => {
                setSearchTerm(tempSearchTerm);
                inputRef.current?.blur();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Search
            </button>
          </div>
          
          <Select
            placeholder="Select Category"
            isClearable
            options={categoryOptions}
            onChange={(option) => setSelectedCategory(option?.value || null)}
            className="text-sm"
          />
        </div>
      </div>
    );
  };

  const getRecentEvents = () => {
    return events.filter(event => {
      return event.point_status === 'pending' && event.event_status === 'approved';
    }).sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  };

  const getHistoryEvents = () => {
    return events.filter(event => {
      return event.point_status === 'assigned' && event.event_status === 'completed';
    }).sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
  };

  if (isLoadingEvents || isLoadingGoals) {
    return (
      <Layout>
        <div className="flex-1 bg-purple-100 flex items-center justify-center min-h-screen">
          <div className="text-purple-600 text-xl">
            {isLoadingGoals ? "Loading goals..." : "Loading events..."}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex-1 bg-purple-100 flex flex-col items-center justify-center min-h-screen">
          <div className="text-red-600 text-xl mb-4">{error}</div>
          <button 
            onClick={() => fetchData()} 
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Try Again
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1 bg-purple-50 p-8 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`${
                  activeTab === "overview" ? "text-purple-600" : "text-gray-600"
                }`}
              >
                MyCSD
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`${
                  activeTab === "history" ? "text-purple-600" : "text-gray-600"
                }`}
              >
                History
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`${
                  activeTab === "events" ? "text-purple-600" : "text-gray-600"
                }`}
              >
                Events
              </button>
            </div>
          </div>

          {activeTab === "overview" && (
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              <h2 className="text-lg font-semibold mb-4">Records</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-100 p-4 rounded-md text-center">
                  <div className="text-4xl font-bold text-purple-600">
                    {totalPoints}
                  </div>
                  <div className="text-gray-500">Total Points</div>
                </div>
                <div className="bg-purple-100 p-4 rounded-md text-center">
                  <div className="text-4xl font-bold text-purple-600">
                    {goalPoints}
                  </div>
                  <div className="text-gray-500">Goal Points</div>
                </div>
                <div className="bg-purple-100 p-4 rounded-md text-center">
                  <div className="text-4xl font-bold text-purple-600">
                    {Math.round((totalPoints / goalPoints) * 100)}%
                  </div>
                  <div className="text-gray-500">Progress</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={progressData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {progressData.map((_, index) => (
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

                <div className="space-y-4">
                  <ProgressMessage 
                    percentage={Math.round((totalPoints / goalPoints) * 100)} 
                  />
                  <ProgressStats 
                    events={events}
                    totalPoints={totalPoints}
                    goalPoints={goalPoints}
                  />
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-purple-600 mb-2">
                  Recent Activity
                </h3>
                {getRecentEvents().slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="flex justify-between items-center py-2 border-b cursor-pointer hover:bg-gray-50"
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
              
              <FilterControls />
              
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
                  {filterEvents().map((event) => (
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
              <h2 className="text-lg font-semibold mb-4">Recent Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {getRecentEvents().map((event) => (
                  <div
                    key={event.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50" 
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="font-medium">{event.event_title}</div>
                    <div className="text-sm text-gray-500">{event.event_date}</div>
                    <div className="mt-2 text-purple-600">
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