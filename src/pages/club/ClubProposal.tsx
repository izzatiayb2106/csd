import { useState, useEffect } from "react";
import { Plus, Calendar} from "lucide-react";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {ClubLayout} from "./ClubDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClubData {
  id: string;
  club_name: string;
}
interface Proposal {
  id: string;
  club_id: string;
  event_title: string;
  event_desc: string;
  proposal_date: Date;
  event_date: string;
  event_cat: string;
  event_club: string;
  event_points: number;
  expected_attendees: number;
  event_status: string;
  pdf_url: string;
}

interface NewProposal {
  event_title: string;
  event_cat: string;
  event_desc: string;
  event_date: string;
  expected_attendees: number;
  event_points: number;
  pdf_url: string;
}

type FilterStatus = "all" | "pending" | "approved" | "rejected" | "completed";

const EventProposal: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterStatus>("all");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [newProposal, setNewProposal] = useState<NewProposal>({
    event_title: "",
    event_cat: "",
    event_desc: "",
    event_date: "",
    expected_attendees: 0,
    event_points: 0,
    pdf_url: "",
  });

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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("Query snapshot:", snapshot.size, "documents found");
        console.log("User email being queried:", userEmail);

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          console.log("Club data found:", doc.data());
          setClubData({
            id: doc.id,
            club_name: doc.data().club_name,
          });
        } else {
          console.error("No club found for email:", userEmail);
          console.log("Current collection data:");
          getDocs(clubRef).then((allDocs) => {
            allDocs.forEach((doc) => console.log(doc.data()));
          });
        }
      },
      (error) => {
        console.error("Error fetching club data:", error);
      }
    );

    return () => unsubscribe();
  }, [userEmail]);

  useEffect(() => {
    console.log("Current clubData:", clubData);
  }, [clubData]);

  useEffect(() => {
    if (!clubData?.id) {
      console.log("No club data available yet");
      return;
    }

    console.log("Fetching proposals for club ID:", clubData.id);

    const eventsRef = collection(db, "EVENTS");
    const q = query(
      eventsRef,
      where("club_id", "==", clubData.id),
      orderBy("proposal_date", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        console.log("Events snapshot size:", snapshot.size);
        console.log(
          "Raw snapshot data:",
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );

        try {
          const proposalsList = (await Promise.all(
            snapshot.docs.map(async (eventDoc) => {
              const data = eventDoc.data();
              console.log("Processing event document:", eventDoc.id, data);

              try {
                const clubRef = doc(db, "CLUB", data.club_id);
                const clubSnap = await getDoc(clubRef);
                const clubName = clubSnap.exists()
                  ? clubSnap.data().club_name
                  : "Unknown Club";

                console.log(
                  "Retrieved club name:",
                  clubName,
                  "for club ID:",
                  data.club_id
                );

                return {
                  id: eventDoc.id,
                  club_id: data.club_id,
                  event_title: data.event_title || "",
                  event_desc: data.event_desc || "",
                  proposal_date: data.proposal_date?.toDate() || new Date(),
                  event_date: data.event_date || "",
                  event_cat: data.event_cat || "",
                  event_club: clubName,
                  event_points: data.event_points || 0,
                  expected_attendees: data.expected_attendees || 0,
                  event_status: data.event_status || "pending",
                  pdf_url: data.pdf_url || "",
                } as Proposal;
              } catch (error) {
                console.error(
                  "Error fetching club data for event:",
                  eventDoc.id,
                  error
                );
                return null;
              }
            })
          )).filter((proposal): proposal is Proposal => proposal !== null); // Added this line to fix the TypeScript error

          setProposals(proposalsList);
        } catch (error) {
          console.error("Error processing proposals:", error);
        }
      },
      (error) => {
        console.error("Error in proposals snapshot listener:", error);
      }
    );

    return () => unsubscribe();
  }, [clubData?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubData?.id) {
      alert("Please wait for club data to load");
      return;
    }

    setIsSubmitting(true);
    try {
      const eventData = {
        ...newProposal,
        club_id: clubData.id,
        event_status: "pending",
        proposal_date: new Date(),
        expected_attendees: Number(newProposal.expected_attendees),
        event_points: Number(newProposal.event_points)
      };

      await addDoc(collection(db, "EVENTS"), eventData);
      setIsDialogOpen(false);
      setNewProposal({
        event_title: "",
        event_cat: "",
        event_desc: "",
        event_date: "",
        expected_attendees: 0,
        event_points: 0,
        pdf_url: "",
      });
    } catch (error) {
      console.error("Error submitting proposal:", error);
      alert("Failed to submit proposal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewProposal((prev) => ({
      ...prev,
      [name]: e.target.type === "number" ? Number(value) : value,
    }));
  };

  const filteredProposals =
    activeTab === "all"
      ? proposals
      : proposals.filter((proposal) => proposal.event_status === activeTab);

  useEffect(() => {
    console.log("Current user email:", userEmail);
    console.log("Current auth state:", auth.currentUser);
  }, [userEmail]);
  return (
    <ClubLayout>
      <div className="p-6">
        {!clubData ? (
          <div className="text-center py-4">Loading club data...</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                {["all", "pending", "approved", "rejected", "completed"].map(
                  (tab) => (
                    <Button
                      key={tab}
                      variant={activeTab === tab ? "default" : "secondary"}
                      onClick={() => setActiveTab(tab as FilterStatus)}
                      className="px-4 py-2"
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Button>
                  )
                )}
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus size={16} />
                    Add Proposal
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Add New Event Proposal</DialogTitle>
                    <DialogDescription>
                      Add a description of what this dialog does
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="event_title">Event Title</Label>
                        <Input
                          id="event_title"
                          name="event_title"
                          placeholder="Enter event title"
                          value={newProposal.event_title}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event_cat">Category</Label>
                        <Input
                          id="event_cat"
                          name="event_cat"
                          placeholder="Enter category"
                          value={newProposal.event_cat}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event_desc">Description</Label>
                        <Textarea
                          id="event_desc"
                          name="event_desc"
                          placeholder="Enter description"
                          value={newProposal.event_desc}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="event_date">Event Date</Label>
                        <Input
                          id="event_date"
                          name="event_date"
                          type="date"
                          value={newProposal.event_date}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="expected_attendees">
                          Expected Attendees
                        </Label>
                        <Input
                          id="expected_attendees"
                          name="expected_attendees"
                          type="number"
                          placeholder="Enter number of expected attendees"
                          value={newProposal.expected_attendees}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="event_points">Proposed Points</Label>
                        <Input
                          id="event_points"
                          name="event_points"
                          type="number"
                          placeholder="Enter proposed points"
                          value={newProposal.event_points}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pdf_url">PDF URL Link</Label>
                      <Input
                        id="pdf_url"
                        name="pdf_url"
                        type="url"
                        placeholder="Enter PDF document URL"
                        value={newProposal.pdf_url}
                        onChange={handleInputChange}
                        className="w-full"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Proposal"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {filteredProposals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No proposals found for the selected filter.
                </div>
              ) : (
                filteredProposals.map((proposal) => (
                  <Card key={proposal.id} className="w-full">
                    <CardContent className="pt-6">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold text-purple-600">
                              {proposal.event_title}
                            </h3>
                            <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                              {proposal.event_club}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-2">
                            {proposal.event_desc}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-gray-500">Event Date</p>
                              <p className="font-medium">
                                {new Date(proposal.event_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">
                                Expected Attendees
                              </p>
                              <p className="font-medium">
                                {proposal.expected_attendees}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">
                                Proposed Points
                              </p>
                              <p className="font-medium">{proposal.event_points}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-4 min-w-[120px]">
                          <div className="flex flex-col gap-2 items-end">
                            <span className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 font-medium">
                              {proposal.event_cat}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                proposal.event_status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : proposal.event_status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : proposal.event_status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                              } font-medium`}
                            >
                              {proposal.event_status.charAt(0).toUpperCase() +
                                proposal.event_status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-2" />
                          Proposal Date:{" "}
                          {new Date(proposal.proposal_date).toLocaleDateString()}
                        </div>
                        {proposal.pdf_url && (
                          <div className="mt-2">
                            <a
                              href={proposal.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View Proposal PDF
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </ClubLayout>
  );
};

export default EventProposal;
