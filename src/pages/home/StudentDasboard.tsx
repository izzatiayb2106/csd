import React, { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { db } from "../../firebaseConfig";
import { getDocs, collection, query, where, onSnapshot, DocumentReference, Firestore, doc as firestoreDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserAuth } from "@/context/userAuthContext";
import { Bell, Calendar as CalendarIcon, Target, Star } from 'lucide-react';


interface User {
  stud_email: string;
  stud_name: string;
  stud_matrics: string;
  id: string;
}

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

interface MYCSD {
  club_id: DocumentReference;
  event_id: DocumentReference;
  mycsd_point: number;
  mycsd_status: string;
  stud_id: DocumentReference;
}

function doc(db: Firestore, collectionName: string, uid: string): DocumentReference {
  return firestoreDoc(db, collectionName, uid);
}

const Home: React.FunctionComponent = () => {
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUserAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [mycsdPoints, setMycsdPoints] = useState<number>(0);

  // Role-based access and redirection
  useEffect(() => {
    if (user?.role === "admin") {
      window.location.href = "/admin";
    } else if (user?.role === "club") {
      window.location.href = "/club"; // Redirect to club dashboard if necessary
    }
  }, [user]);


  const getUserList = async () => {
    try {
      setLoading(true);

      if (!user?.email || user.role !== "student") {
        setError("Access restricted");
        return;
      }

      const userCollectionRef = collection(db, "STUDENT");
      const q = query(userCollectionRef, where("stud_email", "==", user.email));
      const data = await getDocs(q);
      const filteredData = data.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as User[];

      setUserList(filteredData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUserList();
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;

    const fetchGoals = async () => {
        const studentRef = doc(db, 'STUDENT', user.uid);

        const goalsQuery = query(
            collection(db, 'GOALS'),
            where('stud_id', '==', studentRef)
        );

        const unsubscribe = onSnapshot(goalsQuery, (snapshot) => {
            const goalsData: Goal[] = [];
            snapshot.forEach((doc) => {
                goalsData.push({ id: doc.id, ...doc.data() } as Goal);
            });
            setGoals(goalsData);
        });

        return () => unsubscribe();
    };

    const fetchEvents = async () => {
        const studentRef = doc(db, 'STUDENT', user.uid);

        const eventsQuery = query(
            collection(db, 'REMINDER'),
            where('stud_id', '==', studentRef)
        );

        const unsubscribe = onSnapshot(eventsQuery, async (snapshot) => {
            const eventsData: Event[] = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                eventsData.push({
                    id: doc.id,
                    stud_id: data.stud_id,
                    event_name: data.reminder_name,
                    event_date: data.reminder_date,
                    event_time: data.reminder_time,
                    venue: data.reminder_venue,
                    event_notes: data.reminder_notes,
                    points: 0
                });
            }
            console.log("Fetched Events:", eventsData); // Debugging statement
            setEvents(eventsData);
        });

        return () => unsubscribe();
    };

    const fetchMyCSDPoints = async () => {
        const studentRef = doc(db, 'STUDENT', user.uid);

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
    };

    fetchGoals();
    fetchEvents();
    fetchMyCSDPoints();
}, [user]);

const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
};

const isEventOngoing = (eventDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(eventDate);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
};

  // Render restricted content for unauthorized roles
  if (!user || user.role !== "student") {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <p className="text-gray-600">Access restricted.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <CardHeader>
          <CardTitle>
            {loading ? (
              "Loading..."
            ) : error ? (
              <span className="text-red-500">{error}</span>
            ) : userList.length > 0 ? (
              <>Welcome, {userList[0].stud_name!}</>
            ) : (
              "Welcome, Guest!"
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This is your dashboard</p>
          {/* Display total users */}
          <div className="mt-4">
            <p className="text-sm text-gray-500">Total Users: {userList.length}</p>
          </div>
        </CardContent>
  
        <div className="flex flex-wrap gap-6">
          {/* Goals Summary */}
          <Card className="flex-1 min-w-[300px]">
            <CardHeader>
              <CardTitle>
                <Target className="text-blue-600" /> Goals Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Short-Term Goals: {goals.filter((goal) => goal.goal_type === 'short-term').length}
              </p>
              <p className="text-gray-600">
                Long-Term Goals: {goals.filter((goal) => goal.goal_type === 'long-term').length}
              </p>
            </CardContent>
          </Card>
    
          {/* Points Summary */}
          <Card className="flex-1 min-w-[300px]">
            <CardHeader>
              <CardTitle>
                <Star className="text-yellow-500" /> Points Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Total MyCSD Points: {mycsdPoints}</p>
            </CardContent>
          </Card>
  
    
          {/* Ongoing Events */}
          <Card className="flex-1 min-w-[300px]">
            <CardHeader>
              <CardTitle>
                <CalendarIcon className="text-blue-600" /> Ongoing Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.filter(event => isEventOngoing(event.event_date)).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">No ongoing events</p>
                )}
                {events.filter(event => isEventOngoing(event.event_date)).map(event => (
                  <div key={event.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium">{event.event_name}</h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(new Date(event.event_date))} at {event.event_time} • {event.venue}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
    
          {/* Recent Activities */}
          <Card className="flex-1 min-w-[300px]">
            <CardHeader>
              <CardTitle>
                <Bell className="text-blue-600" /> Recent Activities
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </Layout>
  );
  
};

export default Home;
