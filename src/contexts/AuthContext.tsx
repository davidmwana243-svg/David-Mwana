import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserProfile } from '../models/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        const profileRef = doc(db, 'users', currentUser.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'User',
              photoUrl: currentUser.photoURL || undefined,
              wishlist: [],
              createdAt: Date.now(),
            };
            await setDoc(profileRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = user?.email === 'davstore4@gmail.com' || user?.email === 'davidmwana243@gmail.com';

  const toggleWishlist = async (productId: string) => {
    if (!user || !profile) return;
    
    const newWishlist = profile.wishlist?.includes(productId)
      ? profile.wishlist.filter(id => id !== productId)
      : [...(profile.wishlist || []), productId];

    // Optimistic update
    setProfile({ ...profile, wishlist: newWishlist });

    const profileRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(profileRef, { wishlist: newWishlist });
    } catch (error) {
      console.error("Error updating wishlist", error);
      // Revert optimistic update (simplistic)
      setProfile(profile);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signInWithGoogle, logout, toggleWishlist }}>
      {children}
    </AuthContext.Provider>
  );
};

