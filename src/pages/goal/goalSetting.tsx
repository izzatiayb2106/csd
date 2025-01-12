import React, { useState, useEffect } from 'react';
import { Bell, Calendar as CalendarIcon, Target, Plus, Check, Star, User, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Layout from '@/components/layout';

type Value = Date | Date[] | null | [Date | null, Date | null];

interface Goal {
  id: string;
  stud_email: string;
  goal_title: string;
  goal_points: number;
  goal_deadline: string;
  completed: boolean;
  goal_type: 'short-term' | 'long-term';
  goal_milestones?: string[];
}

interface Event {
  id: string;
  stud_email: string;
  event_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  event_notes: string;
  points: number;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB'); // This will format as dd/mm/yyyy
};

const MyCSDDashboard = () => {
  // Current MyCSD Points Status
  const [pointsStatus] = useState({
    current: 12,
    //target: 30
  });

  const [goals, setGoals] = useState<{
    shortTerm: Goal[];
    longTerm: Goal[];
  }>({
    shortTerm: [],
    longTerm: []
  });

  const [stud_email, setStudEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStudEmail(user?.email || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!stud_email) return;

    const goalsQuery = query(
      collection(db, 'GOALS'),
      where('stud_email', '==', stud_email)
    );
    
    const unsubscribe = onSnapshot(goalsQuery, (snapshot) => {
      const shortTermGoals: Goal[] = [];
      const longTermGoals: Goal[] = [];
      
      snapshot.forEach((doc) => {
        const goal = { id: doc.id, ...doc.data() } as Goal;
        console.log("Goal data:", goal);
        console.log("Goal type:", goal.goal_type);
        if (goal.goal_type === 'short-term') {
          shortTermGoals.push(goal);
        } else {
          longTermGoals.push(goal);
        }
      });

      setGoals({
        shortTerm: shortTermGoals,
        longTerm: longTermGoals
      });
    });

    return () => unsubscribe();
  }, [stud_email]);

  // Calendar Events State
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!stud_email) return;

    const remindersQuery = query(
      collection(db, 'REMINDER'),
      where('stud_email', '==', stud_email)
    );
    
    const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        eventsData.push({
          id: doc.id,
          stud_email: data.stud_email,
          event_name: data.reminder_name,
          event_date: data.reminder_date,
          event_time: data.reminder_time,
          venue: data.reminder_venue,
          event_notes: data.reminder_notes,
          points: 0
        });
      });
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [stud_email]);

  // Modal State
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);

  // Toggle Modal
  const toggleModal = () => {
    setModalOpen(!isModalOpen);
    setGoalType('short-term');
  };
  const toggleEventModal = () => {
    setEventModalOpen(!isEventModalOpen);
    console.log("Event Modal Toggled: ", !isEventModalOpen);
  };

  // Handle New Goal Submission
  const handleGoalSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    
    const newGoal = {
      stud_email,
      goal_type: formData.get('type') as string,
      goal_title: formData.get('name') as string,
      goal_points: Number(formData.get('points')),
      goal_deadline: formData.get('dueDate') as string,
      completed: false,
      createdAt: new Date(),
      goal_milestones: (formData.get('milestones') as string)?.split('\n') || undefined,
    };
    
    try {
      const docRef = await addDoc(collection(db, 'GOALS'), newGoal);
      console.log("Goal successfully added with ID:", docRef.id);
      toggleModal();
    } catch (error) {
      console.error("Error adding goal:", error);
      alert("Failed to add goal. Please try again.");
    }
  };
  
  //handle new event submission
const handleEventSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  const formData = new FormData(event.target as HTMLFormElement);
  const newReminder = {
    stud_email,
    reminder_name: formData.get('name') as string,
    reminder_date: formData.get('date') as string,
    reminder_time: formData.get('time') as string,
    reminder_venue: formData.get('venue') as string,
    reminder_notes: formData.get('notes') as string,
    createdAt: new Date()
  };

  try {
    const docRef = await addDoc(collection(db, 'REMINDER'), newReminder);
    console.log('Reminder successfully added with ID:', docRef.id);
    toggleEventModal();
  } catch (error) {
    console.error('Error adding reminder:', error);
    alert('Failed to add reminder. Please try again.');
  }
};

  const [activeTab, setActiveTab] = useState<'short-term'| 'long-term'>('short-term');
  const [goalType, setGoalType] = useState<'short-term' | 'long-term'>('short-term');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Redirect to login page or handle logout success
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotifications || showProfileMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.relative')) {
          setShowNotifications(false);
          setShowProfileMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications, showProfileMenu]);

  const [date, setDate] = useState(new Date());

  // Add new state for selected date
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Modify calendar click handler
  const handleDateClick = (value: Value) => {
    if (value instanceof Date) {
      setDate(value);
      setSelectedDate(value);
      toggleEventModal();
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">MyCSD Goals</h1>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-full relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b">
                      <h3 className="font-semibold">Notifications</h3>
                    </div>
                    {/* Add your notifications items here */}
                    <div className="px-4 py-2 hover:bg-gray-50">
                      <p className="font-medium">New Event Added</p>
                      <p className="text-sm text-gray-500">Programming Workshop tomorrow</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 hover:bg-gray-100 rounded-lg px-3 py-2"
                >
                  <User className="w-5 h-5" />
                  <span>{stud_email}</span>
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <a 
                      href="/profile" 
                      className="px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </a>
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header with Points Overview */}
          <div className="flex items-center justify-between">
            <h1 className="text-5xl font-bold">MyCSD Goals</h1>
            <Card className="w-fit">
              <CardContent className="py-3 flex items-center gap-3">
                <Star className="text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">MyCSD Points</p>
                  <p className="text-xl font-bold">{pointsStatus.current}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Goals Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="text-blue-600" />
                    My Goals
                  </CardTitle>
                  <button
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                    onClick={toggleModal}
                  >
                    <Plus className="inline-block mr-1 h-4 w-4" />
                    Set New Goal
                  </button>
                </CardHeader>
                <CardContent>
                  <div>
                    {/*Tab List */}
                    <div className="flex space-x-4 border-b pb-2">
                      <button
                        className={`px-3 py-2 text-sm font-medium ${
                          activeTab === 'short-term' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
                        }`}
                        onClick = {() => setActiveTab('short-term')}
                      >Short-Term Goals</button>
                      <button
                        className={`px-3 py-2 text-sm font-medium ${
                          activeTab === 'long-term' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'
                        }`}
                        onClick={() => setActiveTab('long-term')}
                        >Long-Term Goals</button>
                    </div>
                  </div>
                  {/* <Tabs defaultValue="short-term"></Tabs> */}

                  {/* Tabs Content */}
                  <div className='mt-4'>
                    {activeTab === 'short-term' && (
                      <div className='space-y-4'>
                        {goals.shortTerm.map((goal) => (
                          <div key={goal.id} className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
                            <div className="flex items-center gap-3">
                              <button className='w-5 h-5 rounded-full border-2 border-gray-400 flex items-center justify-center'>
                                {goal.completed && <Check className="w-4 h-4 text-blue-600" />}
                              </button>
                              <div>
                                <p className='font-medium'>{goal.goal_title}</p>
                                <p className='text-sm text-gray-500'>Due: {formatDate(new Date(goal.goal_deadline))}</p>
                              </div>
                            </div>
                            <span className='bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded'>
                              {goal.goal_points} points
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'long-term' && (
                      <div className='space-y-4'>
                        {goals.longTerm.map((goal) => (
                          <div key={goal.id} className='p-4 bg-gray-50 rounded-lg'>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-medium">{goal.goal_title}</h3>
                                <p className="text-sm text-gray-500">Target: {formatDate(new Date(goal.goal_deadline))}</p>
                              </div>
                              <span className='bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded'>
                                {goal.goal_points} points
                              </span>
                            </div>
                            <div className='space-y-2 pl-4'>
                              {goal.goal_milestones?.map((milestone, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                  <span>{milestone}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>
          </div>

            {/* Calendar Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="text-blue-600" />
                  Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  onChange={handleDateClick}
                  value={date}
                  className="w-full border-none"
                  tileClassName={({ date: tileDate }) => {
                    const hasEvent = events.some(event => 
                      formatDate(new Date(event.event_date)) === formatDate(tileDate)
                    );
                    return hasEvent ? 'bg-blue-100 rounded-full' : 'text-sm';
                  }}
                  tileContent={({ date: tileDate }) => {
                    const hasEvent = events.some(event => 
                      formatDate(new Date(event.event_date)) === formatDate(tileDate)
                    );
                    return hasEvent ? <div className="w-1 h-1 bg-blue-600 rounded-full mx-auto mt-1"></div> : null;
                  }}
                />
              </CardContent>
            </Card>

            {/* Notifications Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="text-blue-600" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <AlertDescription>
                      <p className="font-medium">Event Reminder</p>
                      <p className="text-sm text-gray-500">Programming Workshop tomorrow at 2:00 PM</p>
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertDescription>
                      <p className="font-medium">Goal Update</p>
                      <p className="text-sm text-gray-500">5 days left to complete your short-term goal</p>
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertDescription>
                      <p className="font-medium">Points Earned</p>
                      <p className="text-sm text-gray-500">You've earned 2 MyCSD points from recent activity</p>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>


              {/* Event Section */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="text-blue-600" />
                      Upcoming Events
                    </CardTitle>
                    <button
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                      onClick={toggleEventModal}
                    >
                      <Plus className="inline-block mr-1 h-4 2-4" />
                      Add Event
                    </button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {events.map(event => (
                        <div key={event.id} className="p-4 border rounded-lg">
                          <div>
                            <h3 className="font-medium">{event.event_name}</h3>
                            <p className="text-sm text-gray-500">
                              {formatDate(new Date(event.event_date))} at {event.event_time} • {event.venue}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              Notes: {event.event_notes}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                  <h2 className="text-lg font-semibold mb-4">Set New Goal</h2>
                  <form 
                    onSubmit={handleGoalSubmit} 
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">Goal Type</label>
                      <select 
                        name="type" 
                        className="w-full border rounded px-3 py-2"
                        onChange={(e) => setGoalType(e.target.value as 'short-term' | 'long-term')}
                      >
                        <option value="short-term">Short Term</option>
                        <option value="long-term">Long Term</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Goal Name</label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter goal name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Due Date</label>
                      <input
                        type="date"
                        name="dueDate"
                        required
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">MyCSD Points</label>
                      <input
                        type="number"
                        name="points"
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="Expected points"
                      />
                    </div>
                    <div className={goalType === 'long-term' ? 'block' : 'hidden'}>
                      <label className="block text-sm font-medium mb-1">Milestones</label>
                        <textarea
                          name="milestones"
                          className="w-full border rounded px-3 py-2"
                          placeholder="Enter milestones (one per line)"
                        ></textarea>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                        onClick={toggleModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Reminder Modal */}
            {isEventModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                  <h2 className="text-lg font-semibold mb-4">
                    Add Reminder on {selectedDate ? formatDate(selectedDate) : ''}
                  </h2>
                  <form
                    onSubmit={handleEventSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">Reminder</label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter reminder"
                      />
                    </div>
                    <input
                      type="hidden"
                      name="date"
                      value={selectedDate?.toISOString().split('T')[0]}
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1">Time</label>
                      <input
                        type="time"
                        name="time"
                        required
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Venue</label>
                      <input
                        type="text"
                        name="venue"
                        required
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter venue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        name="notes"
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter additional notes"
                      ></textarea>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                        onClick={toggleEventModal}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
         </div>
      </div>
    </Layout>
  );
};

export default MyCSDDashboard;
