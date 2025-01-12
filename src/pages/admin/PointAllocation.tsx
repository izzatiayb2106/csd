import { useState, useEffect } from "react";
import { Users, FileText, Award, X } from "lucide-react";
import { db } from "../../firebaseConfig";
import { collection, query, onSnapshot, where, doc, getDocs, writeBatch, getDoc,} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { AdminLayout } from "./AdminDashboard";

interface Attendee {
  stud_id: string;
  point: "pending" | "assigned";
  stud_name?: string;
  stud_email?: string;
  stud_matrics?: string;
}

interface Event {
  id: string;
  event_title: string;
  event_club: string;
  event_points: number;
  event_status: string;
  point_status: "pending" | "assigned";
  pdf_url?: string;
}

export default function PointAllocation() {
  const [events, setEvents] = useState<Event[]>([]);
  const [pointsFilter, setPointsFilter] = useState<
    "all" | "pending" | "assigned"
  >("all");
  const [selectedAttendees, setSelectedAttendees] = useState<Attendee[] | null>(
    null
  );
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    const eventsRef = collection(db, "EVENTS");
    let q;

    if (pointsFilter === "all") {
      q = query(eventsRef, where("event_status", "==", "completed"));
    } else {
      q = query(
        eventsRef,
        where("event_status", "==", "completed"),
        where("point_status", "==", pointsFilter)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            event_title: data.event_title || "",
            event_club: data.event_club || "",
            event_points: data.event_points || 0,
            event_status: data.event_status,
            point_status: data.point_status || "pending",
            pdf_url: data.pdf_url || "",
          } as Event;
        });

        setEvents(eventsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching events:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pointsFilter]);

  const handleViewParticipants = async (event: Event) => {
    try {
      setLoading(true);
      console.log("1. Starting to fetch attendees for event:", event.id);

      const attendeesRef = collection(db, "EVENTS", event.id, "ATTENDEES");
      const attendeesSnapshot = await getDocs(attendeesRef);

      if (attendeesSnapshot.empty) {
        setSelectedAttendees([]);
        setSelectedEvent(event);
        return;
      }

      const attendeesPromises = attendeesSnapshot.docs.map(
        async (attendeeDoc) => {
          const attendeeData = attendeeDoc.data();

          try {
            // Extract the actual student ID by removing the "STUDENT/" prefix
            const studentId = attendeeData.stud_id.replace("STUDENT/", "");
            console.log("Fetching student with cleaned ID:", studentId);

            const studentRef = doc(db, "STUDENT", studentId);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
              const studentData = studentSnap.data();
              return {
                stud_id: attendeeData.stud_id,
                point: attendeeData.point,
                stud_name: studentData.stud_name || "No name found",
                stud_email: studentData.stud_email || "No email found",
                stud_matrics: studentData.stud_matrics || "No matrics found",
              };
            } else {
              return {
                stud_id: attendeeData.stud_id,
                point: attendeeData.point,
                stud_name: "Student not found",
                stud_email: "N/A",
                stud_matrics: "N/A",
              };
            }
          } catch (error) {
            console.error("Error processing student:", error);
            return {
              stud_id: attendeeData.stud_id,
              point: attendeeData.point,
              stud_name: "Error loading",
              stud_email: "Error loading",
              stud_matrics: "Error loading",
            };
          }
        }
      );

      const attendees = await Promise.all(attendeesPromises);
      setSelectedAttendees(attendees);
      setSelectedEvent(event);
    } catch (error) {
      console.error("Error in handleViewParticipants:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPoints = async (eventId: string) => {
    try {
      const batch = writeBatch(db);

      // 1. Get the event details for points value
      const eventRef = doc(db, "EVENTS", eventId);
      const eventSnap = await getDoc(eventRef);
      const eventData = eventSnap.data();
      const pointsToAdd = eventData?.event_points || 0;

      // 2. Get all attendees of the event
      const attendeesRef = collection(db, "EVENTS", eventId, "ATTENDEES");
      const attendeesSnapshot = await getDocs(attendeesRef);

      // 3. For each attendee, update their MYCSD document
      for (const attendeeDoc of attendeesSnapshot.docs) {
        const attendeeData = attendeeDoc.data();
        const studentId = attendeeData.stud_id.replace("STUDENT/", "");

        // Get the MYCSD document for this student
        const mycsdQuery = query(
          collection(db, "MYCSD"),
          where("student_ID", "==", `/STUDENT/${studentId}`)
        );
        const mycsdSnapshot = await getDocs(mycsdQuery);

        if (!mycsdSnapshot.empty) {
          const mycsdDoc = mycsdSnapshot.docs[0];
          const mycsdData = mycsdDoc.data();

          // Update MYCSD document
          batch.update(doc(db, "MYCSD", mycsdDoc.id), {
            mycsd_point: (mycsdData.mycsd_point || 0) + pointsToAdd,
            mycsd_status: "assigned",
          });
        }

        // Update attendee's point status
        batch.update(attendeeDoc.ref, {
          point: "assigned",
        });
      }

      // 4. Update event's point_status
      batch.update(eventRef, {
        point_status: "assigned",
      });

      // 5. Commit all updates
      await batch.commit();
      console.log("Points assigned successfully");
    } catch (error) {
      console.error("Error assigning points:", error);
      throw error;
    }
  };

  const FilterSection = () => (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <div className="flex flex-wrap gap-3">
        {["all", "pending", "assigned"].map((filter) => (
          <button
            key={filter}
            onClick={() => setPointsFilter(filter as any)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              pointsFilter === filter
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout>
      <div className="space-y-6">
        <FilterSection />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <FilterSection />

      {events.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
          No events found
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-purple-600">
                    {event.event_title}
                  </h3>
                  <p className="text-gray-600 mt-1">{event.event_club}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Points per Student
                      </p>
                      <p className="font-medium">{event.event_points}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm ${
                          event.point_status === "assigned"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {event.point_status.charAt(0).toUpperCase() +
                          event.point_status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                  <button
                    onClick={() => handleViewParticipants(event)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    View Participants
                  </button>
                  {event.pdf_url && (
                    <button
                      onClick={() => window.open(event.pdf_url, "_blank")}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      View Report
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      try {
                        setIsAssigning(true);
                        await handleAssignPoints(event.id);
                        // Optionally show success message
                        toast.success("Points assigned successfully!");
                      } catch (error) {
                        console.error("Failed to assign points:", error);
                        // Optionally show error message
                        toast.error(
                          "Failed to assign points. Please try again."
                        );
                      } finally {
                        setIsAssigning(false);
                      }
                    }}
                    disabled={isAssigning || event.point_status === "assigned"}
                    className={`flex items-center justify-center gap-2 px-4 py-2 ${
                      isAssigning || event.point_status === "assigned"
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white rounded-lg transition-colors`}
                  >
                    {isAssigning ? (
                      <>
                        <span className="animate-spin">⌛</span>
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Award className="h-4 w-4" />
                        Assign Points
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAttendees && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">
                  {selectedEvent.event_title}
                </h3>
                <p className="text-gray-500 mt-1">{selectedEvent.event_club}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedAttendees(null);
                  setSelectedEvent(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Award className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Points per Student
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      {selectedEvent.event_points}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">
                      Total Participants
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {selectedAttendees.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {selectedAttendees.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  No participants found for this event
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedAttendees.map((attendee) => (
                      <tr
                        key={attendee.stud_id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {attendee.stud_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {attendee.stud_matrics}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {attendee.stud_email}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
