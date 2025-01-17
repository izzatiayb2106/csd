import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, collection, addDoc, Timestamp } from "firebase/firestore";
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
        // Get the full current URL (path + query)
        const returnUrl = encodeURIComponent(window.location.href);
        navigate(`/login?returnUrl=${returnUrl}`);
      }
    });
  
    return () => unsubscribe(); // Cleanup on component unmount
  }, [navigate]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;

      try {
        const eventRef = doc(db, "EVENTS", eventId);
        const eventSnap = await getDoc(eventRef);

        if (eventSnap.exists()) {
          setEvent({ id: eventSnap.id, ...eventSnap.data() });
        } else {
          setError("Event not found");
        }
      } catch (err) {
        setError("Failed to fetch event details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  const recordAttendance = async () => {
    if (!event || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      // Get student ID from user profile or auth
      const userRef = doc(db, "STUDENTS", auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        throw new Error("Student profile not found");
      }

      const studentData = userSnap.data();
      
      // Add attendance record to subcollection
      const attendeesRef = collection(db, "EVENTS", event.id, "ATTENDEES");
      await addDoc(attendeesRef, {
        stud_id: studentData.stud_id,
        timestamp: Timestamp.now(),
        email: auth.currentUser.email
      });

      setSuccess(true);
    } catch (err) {
      setError("Failed to record attendance");
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
    return (
      <div className="bg-[#967bb6] min-h-screen w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-lg">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-[#614C82] mb-2">Attendance Recorded!</h2>
            <p className="text-[#725A97]">Your attendance has been successfully recorded for {event?.event_title}</p>
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