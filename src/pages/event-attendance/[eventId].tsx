import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, collection, addDoc, Timestamp, where, query, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle } from "lucide-react";

const EventAttendance = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        console.log("No authenticated user found, redirecting to login");
        const returnUrl = encodeURIComponent(window.location.pathname);
        navigate(`/login?returnUrl=${returnUrl}`, {
          replace: true
        });
      } else {
        console.log("Authenticated user:", user.email);
      }
    });
  
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) {
        console.error("fetchEventDetails: No event ID provided");
        setError("No event ID provided");
        setIsLoading(false);
        return;
      }

      try {
        console.log("fetchEventDetails: Attempting to fetch event with ID:", eventId);
        const eventRef = doc(db, "EVENTS", eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          console.log("fetchEventDetails: Event found:", eventSnap.data());
          setEvent({ id: eventSnap.id, ...eventSnap.data() });
        } else {
          console.error("fetchEventDetails: No event found with ID:", eventId);
          setError("Event not found");
        }
      } catch (err) {
        console.error("fetchEventDetails: Error fetching event:", err);
        if (err instanceof Error) {
          console.error("fetchEventDetails: Error details:", {
            message: err.message,
            stack: err.stack
          });
        }
        setError("Failed to fetch event details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const handleSignOutAndRedirect = async () => {
    try {
      console.log("handleSignOutAndRedirect: Attempting to sign out user");
      await signOut(auth);
      console.log("handleSignOutAndRedirect: User signed out successfully");
      window.location.reload();
    } catch (err) {
      console.error("handleSignOutAndRedirect: Error signing out:", err);
      if (err instanceof Error) {
        console.error("handleSignOutAndRedirect: Error details:", {
          message: err.message,
          stack: err.stack
        });
      }
      setError("Failed to sign out");
    }
  };

  const recordAttendance = async () => {
    if (!event || !auth.currentUser) {
      console.error("recordAttendance: Missing requirements:", {
        event: !!event,
        currentUser: !!auth.currentUser
      });
      setError("No event data or user not authenticated");
      return;
    }
  
    setIsSubmitting(true);
    try {
      console.log("recordAttendance: Starting attendance recording process");
      console.log("recordAttendance: User details:", {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email
      });

      const attendeesRef = collection(db, "EVENTS", event.id, "ATTENDEES");
      const q = query(attendeesRef, where("email", "==", auth.currentUser.email));
      const attendeeSnapshot = await getDocs(q);
  
      if (!attendeeSnapshot.empty) {
        console.warn("recordAttendance: Duplicate attendance detected for user:", auth.currentUser.email);
        setError("Attendance already recorded for this event");
        return;
      }
  
      console.log("recordAttendance: Fetching student profile");
      const userRef = doc(db, "STUDENT", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.error("recordAttendance: Student profile not found for user:", auth.currentUser.uid);
        setError("Student profile not found");
        return;
      }
  
      const studentData = userSnap.data();
      console.log("recordAttendance: Student data retrieved:", studentData);
  
      const attendanceData = {
        timestamp: Timestamp.now(),
        email: auth.currentUser.email,
        name: studentData.stud_name || auth.currentUser.displayName || '',
        userId: auth.currentUser.uid,
        stud_id: studentData.stud_matrics || ''
      };

      console.log("recordAttendance: Recording attendance with data:", attendanceData);
      await addDoc(attendeesRef, attendanceData);
      console.log("recordAttendance: Attendance recorded successfully");

      setSuccess(true);
      
      console.log("recordAttendance: Starting sign-out timer");
      setTimeout(() => {
        console.log("recordAttendance: Timer completed, initiating sign-out");
        handleSignOutAndRedirect();
      }, 10000);

    } catch (err) {
      console.error("recordAttendance: Error recording attendance:", err);
      if (err instanceof Error) {
        console.error("recordAttendance: Error details:", {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
      setError(err instanceof Error ? err.message : "Failed to record attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#967bb6] min-h-screen w-full flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (error) {
    console.error("Rendering error state:", error);
    return (
      <div className="bg-[#967bb6] min-h-screen w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-lg">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    console.log("Rendering success state");
    return (
      <div className="bg-[#967bb6] min-h-screen w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-lg">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-[#614C82] mb-2">Attendance Recorded!</h2>
            <p className="text-[#725A97]">Your attendance has been successfully recorded for {event?.event_title}</p>
            <p className="text-[#725A97] mt-4">Signing out in a moment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-[#967bb6] min-h-screen w-full flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-lg">
        <CardHeader>
          <CardTitle className="text-[#614C82]">{event?.event_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-[#725A97]">{event?.event_desc}</p>
          <p className="mb-6 text-[#725A97]">
            Date: {new Date(event?.event_date).toLocaleDateString()}
          </p>
          <Button 
            className="w-full bg-[#614C82] hover:bg-[#523D73] text-white"
            onClick={recordAttendance}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Recording..." : "Record Attendance"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventAttendance;