import { useState, useEffect } from "react";
import { Eye, CheckCircle, XCircle, Calendar} from "lucide-react";
import { db } from "../../firebaseConfig";
import { collection, query, onSnapshot, where, doc, updateDoc,} from "firebase/firestore";
import { AdminLayout } from "./AdminDashboard";

// Define the type for your event data
interface ProposedEvent {
  id: string;
  event_title: string;
  event_desc: string;
  proposal_date: string;
  event_date: string;
  event_cat: string;
  event_club: string;
  event_points: number;
  expected_attendees: number;
  event_status: string;
  pdf_url?: string;
}

type FilterStatus = "all" | "pending" | "approved" | "rejected" | "completed";

export default function EventProposals() {
  const [events, setEvents] = useState<ProposedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<FilterStatus>("all");

  // Fetch events from Firebase
  useEffect(() => {
    setLoading(true);
    console.log("Current filter:", eventFilter);

    const eventsRef = collection(db, "EVENTS");
    let q;

    if (eventFilter === "all") {
      q = query(eventsRef);
    } else {
      q = query(eventsRef, where("event_status", "==", eventFilter));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("Snapshot size:", snapshot.size);

        const eventsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Document data:", data); // Debug log to check the data

          return {
            id: doc.id,
            event_title: data.event_title || "",
            event_desc: data.event_desc || "",
            proposal_date: data.proposal_date?.toDate().toISOString() || "",
            event_date: data.event_date || "",
            event_cat: data.event_cat || "",
            event_club: data.event_club || "",
            event_points: data.event_points || 0,
            expected_attendees: data.expected_attendees || 0,
            event_status: data.event_status || "pending",
            pdf_url: data.pdf_url || "",
          } as ProposedEvent;
        });

        console.log("Processed events:", eventsList); // Debug log to check processed data
        setEvents(eventsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching events:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventFilter]);

  const handleApproveEvent = async (eventId: string) => {
    try {
      const eventRef = doc(db, "EVENTS", eventId);
      await updateDoc(eventRef, {
        event_status: "approved",
        updatedAt: new Date().toISOString(),
      });
      console.log("Event approved successfully");
    } catch (error) {
      console.error("Error approving event:", error);
    }
  };

  const handleRejectEvent = async (eventId: string) => {
    try {
      const eventRef = doc(db, "EVENTS", eventId);
      await updateDoc(eventRef, {
        event_status: "rejected",
        updatedAt: new Date().toISOString(),
      });
      console.log("Event rejected successfully");
    } catch (error) {
      console.error("Error rejecting event:", error);
    }
  };

  const handleFilterChange = (filter: FilterStatus) => {
    console.log("Setting filter to:", filter); // Debug log
    setEventFilter(filter);
  };

  if (loading) {
    return (
     
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-wrap gap-3">
          {(
            [
              "all",
              "pending",
              "approved",
              "rejected",
              "completed",
            ] as FilterStatus[]
          ).map((filter) => (
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
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Left Section - Event Info */}
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
                        Expected Participants
                      </p>
                      <p className="font-medium">{event.expected_attendees}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Proposed Points</p>
                      <p className="font-medium">{event.event_points}</p>
                    </div>
                  </div>
                </div>

                {/* Right Section - Status, Category and Actions */}
                <div className="flex flex-col items-end gap-4 min-w-[120px]">
                  <div className="flex flex-col gap-2 items-end">
                    <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 font-medium">
                      {event.event_cat}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        event.event_status === "approved"
                          ? "bg-green-100 text-green-800"
                          : event.event_status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : event.event_status === "completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      } font-medium`}
                    >
                      {event.event_status.charAt(0).toUpperCase() +
                        event.event_status.slice(1)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(event.pdf_url, "_blank")}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Proposal"
                    >
                      <Eye className="h-5 w-5" />
                    </button>

                    {event.event_status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApproveEvent(event.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleRejectEvent(event.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section - Proposal Date */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  Proposal Date:{" "}
                  {new Date(event.proposal_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </AdminLayout>
  );

}
