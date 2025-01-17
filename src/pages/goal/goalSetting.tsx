import React, { useState, useEffect } from 'react';
import { Bell, Calendar as CalendarIcon, Target, Plus, Star, User, LogOut, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, updateDoc, DocumentReference, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Layout from '@/components/layout';

type Value = Date | Date[] | null | [Date | null, Date | null];

interface Goal {
  id: string;
  stud_id: DocumentReference;
  goal_title: string;
  goal_points: number;
  goal_deadline?: string;
  completed: boolean;
  goal_type: 'short-term' | 'long-term';
  goal_milestones?: string[];
  semester?: string;
  createdAt: Date | string;
}

interface Event {
  id: string;
  stud_id: DocumentReference;
  event_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  event_notes: string;
  points: number;
}

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'warning';
}

interface StudentData {
  stud_name: string;
  stud_email: string;
  stud_matrics: string;
  createdAt: string;
}

interface MYCSD {
  club_id: DocumentReference;
  event_id: DocumentReference;
  mycsd_point: number;
  mycsd_status: string;
  stud_id: DocumentReference;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB'); // This will format as dd/mm/yyyy
};

const calculateProgress = (currentPoints: number, targetPoints: number): number => {
  return Math.min((currentPoints / targetPoints) * 100, 100);
};

const formatDateForInput = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const getTodayString = (): string => {
  const today = new Date();
  return formatDateForInput(today);
};

const MyCSDDashboard = () => {

  const [goals, setGoals] = useState<{
    shortTerm: Goal[];
    longTerm: Goal[];
  }>({
    shortTerm: [],
    longTerm: []
  });

  const [stud_id, setStudId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setStudId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!stud_id) return;

    // Create a reference to the student document
    const studentRef = doc(db, 'STUDENT', stud_id);

    const goalsQuery = query(
      collection(db, 'GOALS'),
      where('stud_id', '==', studentRef)  // Use the reference in the query
    );
    
    const unsubscribe = onSnapshot(goalsQuery, (snapshot) => {
      const shortTermGoals: Goal[] = [];
      const longTermGoals: Goal[] = [];
      
      snapshot.forEach((doc) => {
        const goal = { 
          id: doc.id, 
          ...doc.data(),
          stud_id: doc.data().stud_id  // The reference will be maintained
        } as Goal;
        
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
  }, [stud_id]);

  // Calendar Events State
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!stud_id) return;

    // Create a reference to the student document
    const studentRef = doc(db, 'STUDENT', stud_id);

    const remindersQuery = query(
      collection(db, 'REMINDER'),
      where('stud_id', '==', studentRef)  // Use the reference in the query
    );
    
    const unsubscribe = onSnapshot(remindersQuery, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        eventsData.push({
          id: doc.id,
          stud_id: data.stud_id,  // The reference will be maintained
          event_name: data.reminder_name,
          event_date: data.reminder_date,
          event_time: data.reminder_time,
          venue: data.reminder_venue,
          event_notes: data.reminder_notes,
          points: 0
        });
      });

      // Sort events by date and time
      eventsData.sort((a, b) => {
        const dateA = new Date(`${a.event_date} ${a.event_time}`);
        const dateB = new Date(`${b.event_date} ${b.event_time}`);
        return dateA.getTime() - dateB.getTime();
      });

      console.log("Fetched Events:", eventsData); // Debugging statement
      setEvents(eventsData);
    });

    return () => unsubscribe();
  }, [stud_id]);

  const isEventUpcoming = (eventDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(eventDate);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate >= today;
  };

  // Modal State
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);

  // Toggle Modal
  const toggleModal = () => {
    setModalOpen(!isModalOpen);
    if (!isModalOpen) {
      setGoalType('short-term');
      setEditingGoal(null);
    }
  };
  const toggleEventModal = () => {
    setEventModalOpen(!isEventModalOpen);
    console.log("Event Modal Toggled: ", !isEventModalOpen);
  };

  // Handle New Goal Submission
  const handleGoalSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const goalType = formData.get('type') as string;
    
    if (!stud_id) return;

    const studentRef = doc(db, 'STUDENT', stud_id);
    
    const goalData = {
      stud_id: studentRef,
      goal_type: goalType,
      goal_title: formData.get('name') as string,
      goal_points: Number(formData.get('points')),
      completed: editingGoal ? editingGoal.completed : false,
      createdAt: editingGoal ? editingGoal.createdAt : new Date(),
    };

    if (goalType === 'short-term') {
      Object.assign(goalData, {
        goal_deadline: formData.get('dueDate') as string,
        goal_milestones: (formData.get('milestones') as string)?.split('\n') || [],
      });
    } else {
      Object.assign(goalData, {
        semester: formData.get('name') as string,
      });
    }
    
    try {
      if (editingGoal) {
        await updateDoc(doc(db, 'GOALS', editingGoal.id), goalData);
        showToast('Goal successfully updated', 'success');
      } else {
        await addDoc(collection(db, 'GOALS'), goalData);
        showToast('Goal successfully added', 'success');
      }
      setEditingGoal(null);
      toggleModal();
    } catch (error) {
      console.error("Error saving goal:", error);
      showToast('Failed to save goal. Please try again.', 'error');
    }
  };
  
  //handle new event submission
const handleEventSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  const formData = new FormData(event.target as HTMLFormElement);
  const selectedDate = new Date(formData.get('date') as string);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    showToast('Please select a future date', 'error');
    return;
  }

  if (!stud_id) return;

  // Create a reference to the student document
  const studentRef = doc(db, 'STUDENT', stud_id);

  const reminderData = {
    stud_id: studentRef,  // Use the reference instead of the ID string
    reminder_name: formData.get('name') as string,
    reminder_date: formData.get('date') as string,
    reminder_time: formData.get('time') as string,
    reminder_venue: formData.get('venue') as string,
    reminder_notes: formData.get('notes') as string,
    createdAt: new Date()
  };

  try {
    if (editingEvent) {
      await updateDoc(doc(db, 'REMINDER', editingEvent.id), reminderData);
      showToast('Reminder successfully updated', 'success');
    } else {
      await addDoc(collection(db, 'REMINDER'), reminderData);
      showToast('Reminder successfully added', 'success');
    }
    setEditingEvent(null);
    toggleEventModal();
  } catch (error) {
    console.error('Error saving reminder:', error);
    showToast('Failed to save reminder. Please try again.', 'error');
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (value < today) {
        showToast('Cannot add reminders for past dates', 'error');
        return;
      }
      
      setDate(value);
      setSelectedDate(value);
      toggleEventModal();
    }
  };

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      try {
        await deleteDoc(doc(db, 'REMINDER', eventId));
        showToast('Reminder deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting reminder:', error);
        showToast('Failed to delete reminder', 'error');
      }
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'error' | 'success' | 'warning') => {
    const id = Date.now();
    const newToast = { id, message, type };
    
    setToasts(prev => [...prev, newToast]);
    
    // Also add to notifications if it's a warning
    if (type === 'warning') {
      setNotifications(prev => [...prev, newToast]);
    }
    
    // Remove from toasts after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 7000);
  };

  // Add new function to handle goal deletion
  const handleDeleteGoal = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteDoc(doc(db, 'GOALS', goalId));
        showToast('Goal deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting goal:', error);
        showToast('Failed to delete goal', 'error');
      }
    }
  };

  // Add state for editing goal
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Add function to handle goal editing
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setModalOpen(true);
  };

  // Add state for student data
  const [studentData, setStudentData] = useState<StudentData | null>(null);

  // Add effect to fetch student data
  useEffect(() => {
    if (!stud_id) return;

    const fetchStudentData = async () => {
      try {
        const studentDoc = await getDoc(doc(db, 'STUDENT', stud_id));
        if (studentDoc.exists()) {
          setStudentData(studentDoc.data() as StudentData);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      }
    };

    fetchStudentData();
  }, [stud_id]);

  // Add state to track shown notifications
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());

  // Update the checkNotifications function
  const checkNotifications = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create unique keys for notifications
    events.forEach(event => {
      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate.getTime() === today.getTime()) {
        const notificationKey = `event_${event.id}_${event.event_date}`;
        if (!shownNotifications.has(notificationKey)) {
          showToast(
            `Event Today: ${event.event_name} at ${event.event_time}`,
            'warning'
          );
          setShownNotifications(prev => new Set([...prev, notificationKey]));
        }
      }
    });

    goals.shortTerm.forEach(goal => {
      const deadline = new Date(goal.goal_deadline!);
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (!goal.completed) {
        if (daysUntilDeadline === 5) {
          const notificationKey = `goal_${goal.id}_5days`;
          if (!shownNotifications.has(notificationKey)) {
            showToast(
              `5 days left to complete goal: ${goal.goal_title}`,
              'warning'
            );
            setShownNotifications(prev => new Set([...prev, notificationKey]));
          }
        } else if (daysUntilDeadline === 2) {
          const notificationKey = `goal_${goal.id}_2days`;
          if (!shownNotifications.has(notificationKey)) {
            showToast(
              `Only 2 days left to complete goal: ${goal.goal_title}`,
              'warning'
            );
            setShownNotifications(prev => new Set([...prev, notificationKey]));
          }
        }
      }
    });
  };

  // Update the effect dependencies to include shownNotifications
  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, [events, goals.shortTerm, shownNotifications]);

  // Update the notifications dropdown to show stored notifications
  const [notifications, setNotifications] = useState<Toast[]>([]);

  const [mycsdPoints, setMycsdPoints] = useState<number>(0);

  useEffect(() => {
    if (!stud_id) return;

    const studentRef = doc(db, 'STUDENT', stud_id);

    const mycsdQuery = query(
      collection(db, 'MYCSD'),
      where('stud_id', '==', studentRef),
      where('mycsd_status', '==', 'assigned')
    );

    const unsubscribe = onSnapshot(mycsdQuery, (snapshot) => {
      let totalPoints = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as MYCSD;
        totalPoints += data.mycsd_point;
      });
      setMycsdPoints(totalPoints);
    });

    return () => unsubscribe();
  }, [stud_id]);

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
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <div key={notification.id} className="px-4 py-2 hover:bg-gray-50">
                          <p className="font-medium">{notification.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">
                        No notifications
                      </div>
                    )}
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
                  <span>{studentData?.stud_name || 'Loading...'}</span>
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
                  <p className="text-xl font-bold">{mycsdPoints}</p>
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
                    <Target className="text-purple-600" />
                    My Goals
                  </CardTitle>
                  <button
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700"
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
                          activeTab === 'short-term' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'
                        }`}
                        onClick = {() => setActiveTab('short-term')}
                      >Short-Term Goals</button>
                      <button
                        className={`px-3 py-2 text-sm font-medium ${
                          activeTab === 'long-term' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'
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
                          <div key={goal.id} className='p-4 bg-gray-50 rounded-lg'>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-medium">{goal.goal_title}</h3>
                                <p className="text-sm text-gray-500">Due: {formatDate(new Date(goal.goal_deadline!))}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className='bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded'>
                                  {goal.goal_points} points
                                </span>
                                <button
                                  onClick={() => handleEditGoal(goal)}
                                  className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGoal(goal.id)}
                                  className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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

                    {activeTab === 'long-term' && (
                      <div className='space-y-4'>
                        {goals.longTerm.map((goal) => (
                          <div key={goal.id} className='p-4 bg-gray-50 rounded-lg'>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-medium">{goal.semester}</h3>
                                <p className="text-sm text-gray-500">
                                  Progress: {mycsdPoints} / {goal.goal_points} points
                                </p>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-2">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${calculateProgress(mycsdPoints, goal.goal_points)}%` 
                                  }}
                                ></div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1 text-right">
                                {Math.round(calculateProgress(mycsdPoints, goal.goal_points))}%
                              </p>
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
                  <CalendarIcon className="text-purple-600" />
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

            {/* Notifications Panel
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
            </Card> */}


              {/* Event Section */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="text-purple-600" />
                      Upcoming Events
                    </CardTitle>
                    <button
                      className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700"
                      onClick={toggleEventModal}
                    >
                      <Plus className="inline-block mr-1 h-4 2-4" />
                      Add Event
                    </button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {events.filter(event => isEventUpcoming(event.event_date)).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No upcoming events</p>
                      )}
                      {events.filter(event => isEventUpcoming(event.event_date)).map(event => (
                        <div key={event.id} className="p-4 border rounded-lg">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-medium">{event.event_name}</h3>
                              <p className="text-sm text-gray-500">
                                {formatDate(new Date(event.event_date))} at {event.event_time} • {event.venue}
                              </p>
                              <p className="text-sm text-gray-600 mt-2">
                                Notes: {event.event_notes}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditEvent(event)}
                                className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
                  <h2 className="text-lg font-semibold mb-4">
                    {editingGoal ? 'Edit Goal' : 'Set New Goal'}
                  </h2>
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

                    {goalType === 'short-term' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Goal Name</label>
                          <input
                            type="text"
                            name="name"
                            required
                            defaultValue={editingGoal?.goal_title || ''}
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
                            defaultValue={editingGoal?.goal_deadline || ''}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">MyCSD Points</label>
                          <input
                            type="number"
                            name="points"
                            required
                            defaultValue={editingGoal?.goal_points || ''}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Expected points"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Milestones</label>
                          <textarea
                            name="milestones"
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter milestones (one per line)"
                            defaultValue={editingGoal?.goal_milestones?.join('\n') || ''}
                            required
                          ></textarea>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Semester</label>
                          <select
                            name="name"
                            required
                            className="w-full border rounded px-3 py-2"
                          >
                            <option value="Semester 1">Semester 1</option>
                            <option value="Semester 2">Semester 2</option>
                            <option value="Semester 3">Semester 3</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Target Points</label>
                          <input
                            type="number"
                            name="points"
                            required
                            className="w-full border rounded px-3 py-2"
                            placeholder="Enter target points"
                          />
                        </div>
                      </>
                    )}
                    
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
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
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
                    {editingEvent ? 'Edit Reminder' : `Add Reminder on ${selectedDate ? formatDate(selectedDate) : ''}`}
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
                        defaultValue={editingEvent?.event_name || ''}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter reminder"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        name="date"
                        required
                        min={getTodayString()}
                        defaultValue={editingEvent?.event_date || (selectedDate ? formatDateForInput(selectedDate) : '')}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Time</label>
                      <input
                        type="time"
                        name="time"
                        required
                        defaultValue={editingEvent?.event_time || ''}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Venue</label>
                      <input
                        type="text"
                        name="venue"
                        required
                        defaultValue={editingEvent?.venue || ''}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter venue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        name="notes"
                        defaultValue={editingEvent?.event_notes || ''}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Enter additional notes"
                      ></textarea>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
                        onClick={() => {
                          setEditingEvent(null);
                          toggleEventModal();
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                      >
                        {editingEvent ? 'Update' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
         </div>
      </div>
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-white transform transition-all duration-300 ${
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default MyCSDDashboard;
