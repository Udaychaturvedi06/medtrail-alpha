'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  role: 'patient' | 'caregiver' | 'doctor';
  [key: string]: any; // Allow other profile fields
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    try {
      if (!db) {
        console.warn('Firestore is not initialized');
        setProfile(null);
        return;
      }
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Safety Fallback: If profile doc is missing but they have records, reconstruct it
        try {
          const { collection, getDocs, limit, query } = await import('firebase/firestore');
          const q = query(collection(db, 'users', uid, 'records'), limit(1));
          const recordsSnap = await getDocs(q);
          
          if (!recordsSnap.empty) {
            console.log('Profile document missing but records found! Reconstructing profile...');
            const recoveredProfile: UserProfile = {
              role: 'patient',
              name: auth.currentUser?.displayName || 'Recovered User',
              email: auth.currentUser?.email || '',
              recovered: true
            };
            setProfile(recoveredProfile);
            return;
          }
        } catch (e) {
          console.error('Fallback check failed', e);
        }
        
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
