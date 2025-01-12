import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";

export type UserRole = 'student' | 'admin' | 'club';

interface AuthUser extends User {
  role?: UserRole;
}

interface IUserAuthProviderProps {
  children: React.ReactNode;
}

type AuthContextData = {
  user: AuthUser | null;
  loading: boolean;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  googleSignIn: () => Promise<void>;
};

const ADMIN_EMAIL = 'admincsd@gmail.com';

const determineUserRole = (email: string): UserRole => {
  if (email === ADMIN_EMAIL) return 'admin';
  if (email.endsWith('@club.usm.my')) return 'club';
  if (email.endsWith('@student.usm.my')) return 'student';
  throw new Error('Invalid email domain');
};

const getCollectionByRole = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'ADMIN';
    case 'club':
      return 'CLUB';
    case 'student':
      return 'STUDENT';
    default:
      throw new Error('Invalid role');
  }
};

export const userAuthContext = createContext<AuthContextData>({
  user: null,
  loading: true,
  logIn: async () => {},
  signUp: async () => {},
  logOut: async () => {},
  googleSignIn: async () => {},
});

export const UserAuthProvider: React.FC<IUserAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const createUserInFirestore = async (uid: string, email: string, role: UserRole) => {
    const collection = getCollectionByRole(role);
    const userData = {
      email,
      createdAt: new Date().toISOString(),
      // Add role-specific fields
      ...(role === 'student' && {
        stud_email: email,
        stud_matrics: '', // To be updated later
        stud_name: '', // To be updated later
      }),
      ...(role === 'club' && {
        club_email: email,
        club_name: '', // To be updated later
      }),
      ...(role === 'admin' && {
        admin_email: email,
      }),
    };

    await setDoc(doc(db, collection, uid), userData);
  };

  const logIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error('Invalid email or password');
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      if (email === ADMIN_EMAIL) {
        throw new Error("Admin account creation is restricted");
      }
      
      const role = determineUserRole(email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserInFirestore(userCredential.user.uid, email, role);
    } catch (error) {
      throw new Error('Invalid email domain or account already exists');
    }
  };

  const googleSignIn = async () => {
    try {
      const googleAuthProvider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const email = userCredential.user.email!;
      const role = determineUserRole(email);
      await createUserInFirestore(userCredential.user.uid, email, role);
    } catch (error) {
      throw new Error('Google sign-in failed or invalid email domain');
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const role = determineUserRole(currentUser.email!);
          const collection = getCollectionByRole(role);
          const userDoc = await getDoc(doc(db, collection, currentUser.uid));
          
          if (!userDoc.exists()) {
            await createUserInFirestore(currentUser.uid, currentUser.email!, role);
          }
          
          setUser({ ...currentUser, role });
        } catch (error) {
          console.error('Error setting user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    logIn,
    signUp,
    logOut,
    googleSignIn,
  };

  return (
    <userAuthContext.Provider value={value}>
      {children}
    </userAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  return useContext(userAuthContext);
};