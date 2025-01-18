import { useState, useEffect } from "react";
import { QrCode, CheckCircle } from "lucide-react";
import { db, auth } from "../../firebaseConfig";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, updateDoc, Timestamp,} from "firebase/firestore";
import {ClubLayout} from "./ClubDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

interface ClubData {
  id: string;
  club_name: string;
}

interface Event {
  id:string; 
  club_id: string;
  event_title: string;
  event_desc: string;
  event_date: string;
  event_cat: string;
  event_club: string;
  event_points: number;
  expected_attendees: number;
  event_status: string;
  qr_code: string;
}

type FilterStatus = "all" | "approved" | "completed";

const ClubAttendance: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [eventFilter, setEventFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userEmail) return;

    const clubRef = collection(db, "CLUB");
    const q = query(clubRef, where("club_email", "==", userEmail));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setClubData({
          id: doc.id,
          club_name: doc.data().club_name,
        });
      }
    });

    return () => unsubscribe();
  }, [userEmail]);

  useEffect(() => {
    if (!clubData?.id) return;

    const eventsRef = collection(db, "EVENTS");
    let q;

    if (eventFilter === "all") {
      q = query(
        eventsRef,
        where("club_id", "==", clubData.id),
        where("event_status", "in", ["approved", "completed"]),
        orderBy("event_date", "desc")
      );
    } else {
      q = query(
        eventsRef,
        where("club_id", "==", clubData.id),
        where("event_status", "==", eventFilter),
        orderBy("event_date", "desc")
      );
    }

    console.log("Setting up events listener with filter:", eventFilter);

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        console.log("Received events update from Firestore");
        try {
          const eventsList = await Promise.all(
            snapshot.docs.map(async (eventDoc) => {
              const data = eventDoc.data();
              console.log("Processing event:", eventDoc.id, data.event_status);

              try {
                const clubRef = doc(db, "CLUB", data.club_id);
                const clubSnap = await getDoc(clubRef);
                const clubName = clubSnap.exists()
                  ? clubSnap.data().club_name
                  : "Unknown Club";

                if (!data.qr_code) {
                  const newQrCode = generateUniqueQRCode(eventDoc.id);
                  await updateDoc(eventDoc.ref, { qr_code: newQrCode });
                  data.qr_code = newQrCode;
                }

                return {
                  id: eventDoc.id,
                  club_id: data.club_id,
                  event_title: data.event_title || "",
                  event_desc: data.event_desc || "",
                  event_date: data.event_date || "",
                  event_cat: data.event_cat || "",
                  event_club: clubName,
                  event_points: data.event_points || 0,
                  expected_attendees: data.expected_attendees || 0,
                  event_status: data.event_status || "approved",
                  qr_code: data.qr_code,
                } as Event;
              } catch (error) {
                console.error("Error processing event:", eventDoc.id, error);
                return null;
              }
            })
          );

          const validEvents = eventsList.filter((event): event is Event => event !== null);
          console.log("Updating events state with:", validEvents.length, "events");
          setEvents(validEvents);
        } catch (error) {
          console.error("Error processing events:", error);
        }
      },
      (error) => {
        console.error("Error in events snapshot listener:", error);
      }
    );

    return () => {
      console.log("Cleaning up events listener");
      unsubscribe();
    };
  }, [clubData?.id, eventFilter]);

  const generateUniqueQRCode = (eventId: string): string => {
    // Remove the leading space in the baseUrl
    const baseUrl = "https://c7c1-115-164-222-27.ngrok-free.app";
    const encodedEventId = encodeURIComponent(eventId);
    const fullUrl = `${baseUrl}/event-attendance/${encodedEventId}`;
    
    // Add debug logging
    console.log('Generated QR URL:', fullUrl);
    return fullUrl;
};

  const handleStatusChange = async (eventId: string) => {
    setIsUpdating(true);
    try {
      const eventRef = doc(db, "EVENTS", eventId);
      const updateData = {
        event_status: "completed",
        updatedAt: Timestamp.now(),
      };
      
      // Optimistically update the UI using the correct event.id
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId
            ? { ...event, event_status: "completed" }
            : event
        )
      );

      await updateDoc(eventRef, updateData);
    } catch (error) {
      console.error("Error updating event status:", error);
      // Revert optimistic update using the correct event.id
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === eventId
            ? { ...event, event_status: "approved" }
            : event
        )
      );
      alert("Failed to update event status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFilterChange = (filter: FilterStatus) => {
    console.log("Setting filter to:", filter);
    setEventFilter(filter);
  };

  return (
    <ClubLayout>
      <div className="p-6">
        {!clubData ? (
          <div className="text-center py-4">Loading club data...</div>
        ) : (
          <div className="space-y-6">
            {/* Filter Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex flex-wrap gap-3">
                {(["all", "approved", "completed"] as FilterStatus[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleFilterChange(filter)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      eventFilter === filter
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No events found for the selected filter.
                </div>
              ) : (
                events.map((event) => (
                  // Change the key to use event.id instead of event.club_id
                  <Card key={event.id} className="w-full">
                    <CardContent className="pt-6">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold text-purple-600">
                              {event.event_title}
                            </h3>
                            <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                              {event.event_club}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-2">{event.event_desc}</p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-500">Event Date</p>
                              <p className="font-medium">
                                {new Date(event.event_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">
                                Expected Attendees
                              </p>
                              <p className="font-medium">
                                {event.expected_attendees}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Event Points</p>
                              <p className="font-medium">{event.event_points}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-4 min-w-[200px]">
                          <div className="flex flex-col gap-2 items-end">
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                event.event_status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              } font-medium`}
                            >
                              {event.event_status.charAt(0).toUpperCase() +
                                event.event_status.slice(1)}
                            </span>

                            <div className="flex gap-2">
                              {event.event_status === "approved" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  // Use event.id instead of event.club_id
                                  onClick={() => handleStatusChange(event.id)}
                                  disabled={isUpdating}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEvent(event);
                                  setIsQRDialogOpen(true);
                                }}
                              >
                                <QrCode className="h-4 w-4 mr-2" />
                                QR Code
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* QR Code Dialog */}
        <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Event QR Code</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="flex flex-col items-center gap-4 p-4">
                <QRCodeSVG
                  value={selectedEvent.qr_code}
                  size={256}
                  level="H"
                  includeMargin={true}
                  onError={(error) => {
                  console.error('QR Code generation error:', error);
          }}
            />
                <p className="text-sm text-gray-500 text-center">
                  Scan this QR code to record attendance for{" "}
                  {selectedEvent.event_title}
                </p>

                {/* Add this for testing */}
              <a 
                  href={selectedEvent.qr_code} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
              >
                Test Link
              </a>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ClubLayout>
  );
};

export default ClubAttendance;