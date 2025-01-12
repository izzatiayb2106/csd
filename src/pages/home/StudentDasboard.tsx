import React, { useEffect, useState } from "react";
import Layout from "@/components/layout";
import { db } from "../../firebaseConfig";
import { getDocs, collection, query, where } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserAuth } from "@/context/userAuthContext";

interface User {
  stud_email: string;
  stud_name: string;
  stud_matrics: string;
  id: string;
}

const Home: React.FunctionComponent = () => {
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUserAuth();

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
      <div className="p-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              {loading ? (
                "Loading..."
              ) : error ? (
                <span className="text-red-500">{error}</span>
              ) : userList.length > 0 ? (
                `Welcome, ${userList[0].stud_name || "Student"}!`
              ) : (
                "Welcome, Guest!"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">This is the student dashboard.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Home;
