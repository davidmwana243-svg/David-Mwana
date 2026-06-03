import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile as updateAuthProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile } from '../models/types';

const phoneToEmail = (phone: string) => {
  const cleaned = phone.replace(/[\s+()-]/g, '');
  // DRC numbers are usually 9 digits. If it's longer (e.g. including 243) or has a leading 0, 
  // we take the last 9 digits to maintain consistency.
  const core = cleaned.length >= 9 ? cleaned.slice(-9) : cleaned;
  return `${core}@davidstore.com`;
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithPhone: (phone: string, password: string) => Promise<void>;
  signUpWithPhone: (phone: string, password: string, firstName: string, lastName: string, photo?: File) => Promise<void>;
  logout: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  updateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isRegisteringRef = React.useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout: if auth doesn't respond in 15s, stop loading to show the app
    const timer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 15000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      
      clearTimeout(timer);
      setUser(currentUser);
      
      if (currentUser) {
        // If we are currently registering, the signUp function will set the profile.
        // We avoid fetching here to prevent race conditions.
        if (!isRegisteringRef.current) {
          const profileRef = doc(db, 'users', currentUser.uid);
          try {
            const profileSnap = await getDoc(profileRef);
            if (isMounted) {
                    if (profileSnap.exists()) {
                const data = profileSnap.data() as UserProfile;
                
                // Only update if we don't have a better profile in memory or if IDs match
                setProfile(prev => {
                  if (prev && prev.id === currentUser.uid && (prev.firstName || (prev.displayName && prev.displayName !== 'Utilisateur'))) {
                    return prev;
                  }
                  
                  // Extract a fallback from email if it's the custom davidstore format
                  let fallbackName = 'Utilisateur';
                  if (currentUser.email?.endsWith('@davidstore.com')) {
                    const phone = currentUser.email.split('@')[0];
                    fallbackName = `Client ${phone}`;
                  } else if (currentUser.displayName) {
                    fallbackName = currentUser.displayName;
                  }

                  const derivedName = data.displayName && data.displayName !== 'Utilisateur'
                    ? data.displayName
                    : (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : fallbackName);
                  
                  return {
                    ...data,
                    displayName: derivedName
                  };
                });
              } else {
                // If it doesn't exist and we are NOT registering, create a minimal default one
                setProfile(prev => {
                  if (prev && prev.id === currentUser.uid) return prev;
                  
                  let defaultName = 'Utilisateur';
                  if (currentUser.email?.endsWith('@davidstore.com')) {
                    const phone = currentUser.email.split('@')[0];
                    defaultName = `Client ${phone}`;
                  } else if (currentUser.displayName) {
                    defaultName = currentUser.displayName;
                  }

                  const newProfile: UserProfile = {
                    id: currentUser.uid,
                    email: currentUser.email || '',
                    displayName: defaultName,
                    wishlist: [],
                    addresses: [],
                    createdAt: Date.now(),
                    photoUrl: currentUser.photoURL || '',
                  };
                  
                  setDoc(profileRef, newProfile).catch(e => console.error("Error creating default profile doc", e));
                  return newProfile;
                });
              }
            }
          } catch (error) {
            console.error("Error fetching user profile", error);
          }
        }
      } else {
        if (isMounted) {
          setProfile(null);
          isRegisteringRef.current = false;
        }
      }
      
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signUpWithPhone = React.useCallback(async (phone: string, password: string, firstName: string, lastName: string, photo?: File) => {
    isRegisteringRef.current = true;
    try {
      const email = phoneToEmail(phone);
      
      // 1. Create the user in Auth first
      // This makes the user authenticated for subsequent storage/firestore calls
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      let photoUrl = '';
      if (photo) {
        try {
          const storageRef = ref(storage, `profiles/${firebaseUser.uid}_${Date.now()}`);
          const snapshot = await uploadBytes(storageRef, photo);
          photoUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.error("Storage upload failed during signup:", uploadErr);
          // We don't fail the whole signup if photo fails, but we log it
        }
      }

      const displayName = `${firstName} ${lastName}`.trim();
      console.log("Setting up profile for:", displayName, "with photo:", photoUrl ? "Yes" : "No");

      const updateData: any = { displayName };
      if (photoUrl) {
        updateData.photoURL = photoUrl;
      }
      
      await updateAuthProfile(firebaseUser, updateData);
      
      // 2. Set custom db profile
      const profileRef = doc(db, 'users', firebaseUser.uid);
      const newProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: displayName,
        phone: phone,
        firstName: firstName,
        lastName: lastName,
        photoUrl: photoUrl || '',
        wishlist: [],
        addresses: [],
        createdAt: Date.now(),
      };
      
      console.log("Saving Firestore profile:", newProfile);
      await setDoc(profileRef, newProfile);
      
      // CRITICAL: Update profile state BEFORE ending registration mode
      setProfile(newProfile);
      console.log("Profile successfully saved and state updated.");
      
      // Give Auth a moment to settle before allowing navigation to trigger fetches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
       console.error("Sign up error in AuthContext:", error);
       throw error;
    } finally {
      // Small delay just to be safe
      setTimeout(() => {
        isRegisteringRef.current = false;
      }, 5000);
    }
  }, []);

  const signInWithPhone = React.useCallback(async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    const cleanedPhone = phone.replace(/[\s+()-]/g, '');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      if ((cleanedPhone === '0995289355' || cleanedPhone === '243995289355') && password === '0995289') {
        try {
          await signUpWithPhone(phone, password, 'David', 'STORE');
          return;
        } catch (signUpErr) {
          console.error("Auto admin registration failed:", signUpErr);
        }
      }
      throw error;
    }
  }, [signUpWithPhone]);

  const logout = React.useCallback(async () => {
    await signOut(auth);
  }, []);

  const isAdmin = React.useMemo(() => {
    return (
      user?.email === 'davstore4@gmail.com' || 
      user?.email === 'davidmwana243@gmail.com' || 
      profile?.phone?.replace(/[\s+()-]/g, '').endsWith('812345678') || 
      profile?.phone?.replace(/[\s+()-]/g, '').endsWith('999999999') || 
      profile?.phone?.replace(/[\s+()-]/g, '').endsWith('995289355') || 
      user?.email?.includes('admin') ||
      profile?.email?.includes('admin')
    );
  }, [user, profile]);

  const toggleWishlist = React.useCallback(async (productId: string) => {
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
  }, [user, profile]);

  const updateProfile = React.useCallback(async (updatedData: Partial<UserProfile>) => {
    if (!user || !profile) return;

    const newProfile = { ...profile, ...updatedData };
    setProfile(newProfile);

    const profileRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(profileRef, updatedData);
    } catch (error) {
      console.error("Error updating profile", error);
      setProfile(profile);
      throw error;
    }
  }, [user, profile]);

  const value = React.useMemo(() => ({ 
    user, 
    profile, 
    loading, 
    isAdmin, 
    signInWithPhone, 
    signUpWithPhone, 
    logout, 
    toggleWishlist, 
    updateProfile 
  }), [user, profile, loading, isAdmin, signInWithPhone, signUpWithPhone, logout, toggleWishlist, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

