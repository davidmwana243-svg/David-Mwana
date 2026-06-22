import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile as updateAuthProfile,
  sendPasswordResetEmail,
  updateEmail,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile } from '../models/types';
import { registerOrUpdateToken, requestNotificationPermission } from '../services/fcmService';

const phoneToEmail = (phone: string) => {
  const cleaned = phone.replace(/[\s+()-]/g, '');
  // DRC numbers are usually 9 digits. If it's longer (e.g. including 243) or has a leading 0, 
  // we take the last 9 digits to maintain consistency.
  const core = cleaned.length >= 9 ? cleaned.slice(-9) : cleaned;
  return `${core}@davidstore.com`;
};

const compressFileToBase64 = (file: File, maxWidth = 160, maxHeight = 160, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string || '');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        resolve(event.target?.result as string || '');
      };
    };
    reader.onerror = () => {
      resolve('');
    };
  });
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithPhone: (phone: string, password: string) => Promise<void>;
  signUpWithPhone: (phone: string, email: string, password: string, fullName: string, photo?: File) => Promise<void>;
  logout: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  updateProfile: (updatedData: Partial<UserProfile>, photo?: File, bypassEmailVerification?: boolean, forceOverwriteEmail?: boolean) => Promise<{ emailVerificationSent?: boolean } | void>;
  sendPasswordReset: (email: string) => Promise<void>;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceChangelog: string[];
  maintenanceLoaded: boolean;
  setMaintenance: (enabled: boolean, message?: string, changelog?: string[]) => Promise<void>;
  mergeAccounts: (targetEmail: string, otherUid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isRegisteringRef = React.useRef(false);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Mise à jour en cours...");
  const [maintenanceChangelog, setMaintenanceChangelog] = useState<string[]>([
    "Gestion de la photo de profil (choix d'image, permission Android)",
    "Sauvegarde robuste avec timeouts réseau",
    "Optimisations de performance de la base de données"
  ]);
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);

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

  useEffect(() => {
    let isMounted = true;
    const maintenanceRef = doc(db, 'settings', 'app_status');
    
    const unsubMaintenance = onSnapshot(maintenanceRef, (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data();
        setMaintenanceMode(!!data.maintenanceMode);
        setMaintenanceMessage(data.message || "Mise à jour de l'application en cours...");
        setMaintenanceChangelog(data.changelog || [
          "Gestion de la photo de profil (choix d'image, permission Android)",
          "Sauvegarde robuste avec timeouts réseau",
          "Optimisations de performance de la base de données"
        ]);
        setMaintenanceLoaded(true);
      } else {
        // Enregistrer la valeur par défaut
        setDoc(maintenanceRef, {
          maintenanceMode: false,
          message: "Mise à jour de l'application en cours...",
          changelog: [
            "Gestion de la photo de profil (choix d'image, permission Android)",
            "Sauvegarde robuste avec timeouts réseau",
            "Optimisations de performance de la base de données"
          ]
        }).then(() => {
          if (isMounted) setMaintenanceLoaded(true);
        }).catch((err) => {
          console.warn("Failed to create default app_status doc", err);
          if (isMounted) setMaintenanceLoaded(true);
        });
      }
    }, (err) => {
      console.warn("Could not read maintenance status synchronously:", err);
      if (isMounted) setMaintenanceLoaded(true);
    });

    return () => {
      isMounted = false;
      unsubMaintenance();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          registerOrUpdateToken(user?.uid || 'anonymous', isAdmin);
        } else if (Notification.permission === 'default') {
          // Sollicite d'abord l'approbation au démarrage
          requestNotificationPermission(user?.uid || 'anonymous', isAdmin);
        }
      }
    }
  }, [user, isAdmin, loading]);

  const setMaintenance = React.useCallback(async (enabled: boolean, message?: string, changelog?: string[]) => {
    try {
      const maintenanceRef = doc(db, 'settings', 'app_status');
      const payload: any = {
        maintenanceMode: enabled,
        updatedAt: Date.now()
      };
      if (message !== undefined) payload.message = message;
      if (changelog !== undefined) payload.changelog = changelog;
      
      await setDoc(maintenanceRef, payload, { merge: true });
    } catch (err) {
      console.error("Error setting maintenance mode:", err);
      throw err;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Safety timeout: if auth/Firestore doesn't respond in 12s, stop loading to show the app
    const timer = setTimeout(() => {
      if (isMounted) {
        console.warn("Auth initialization safety timeout reached. Continuing to render app.");
        setLoading(false);
      }
    }, 12000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      
      setUser(currentUser);
      
      if (currentUser) {
        // If we are currently registering, the signUp function will set the profile.
        // We avoid fetching here to prevent race conditions.
        if (!isRegisteringRef.current) {
          const profileRef = doc(db, 'users', currentUser.uid);
          try {
            // Racing with a 15-second timeout to prevent stalling the entire page load
            const fetchDocPromise = getDoc(profileRef);
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Firestore connection timeout')), 15000)
            );
            
            let profileSnap;
            try {
              profileSnap = await Promise.race([fetchDocPromise, timeoutPromise]);
            } catch (failErr: any) {
              if (failErr.message === 'Firestore connection timeout') {
                console.warn("Profile fetch timed out, attempting to continue with minimal data if available.");
                // We don't rethrow here, we'll try to handle it 
              } else {
                throw failErr;
              }
            }
            
            if (isMounted) {
              if (profileSnap && profileSnap.exists()) {
                const data = { ...profileSnap.data() } as UserProfile;

                if (currentUser.email && currentUser.email.toLowerCase() !== data.email?.toLowerCase()) {
                  // Only sync if the new email is NOT a virtual email or if the Firestore email is still virtual/empty
                  const isCurrentVirtual = currentUser.email.toLowerCase().endsWith('@davidstore.com');
                  const isFirestoreVirtual = !data.email || data.email.toLowerCase().endsWith('@davidstore.com');
                  
                  if (!isCurrentVirtual || isFirestoreVirtual) {
                    console.log("Detected Auth email and Firestore email mismatch. Syncing to Firestore:", currentUser.email);
                    const userRef = doc(db, 'users', currentUser.uid);
                    updateDoc(userRef, { 
                      email: currentUser.email.toLowerCase(),
                      pendingEmail: ""
                    }).catch(err => console.error("Could not automatically update Firestore email on login sync:", err));
                    data.email = currentUser.email.toLowerCase();
                    data.pendingEmail = "";
                  }
                }
                
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
                // If it doesn't exist (explicitly) OR we timed out, create a minimal local one
                setProfile(prev => {
                  if (prev && prev.id === currentUser.uid) return prev;
                  
                  let defaultName = 'Utilisateur';
                  let extractedPhone = '';
                  if (currentUser.email?.endsWith('@davidstore.com')) {
                    const phone = currentUser.email.split('@')[0];
                    defaultName = `Client ${phone}`;
                    extractedPhone = phone.startsWith('+') ? phone : `+243${phone}`;
                  } else if (currentUser.displayName) {
                    defaultName = currentUser.displayName;
                  }

                  const now = Date.now();
                  const newProfile: UserProfile = {
                    id: currentUser.uid,
                    email: currentUser.email || '',
                    displayName: defaultName,
                    nom: defaultName, // French name mapping
                    phone: extractedPhone,
                    telephone: extractedPhone || 'Numéro non renseigné', // French phone mapping
                    wishlist: [],
                    addresses: [],
                    createdAt: now,
                    dateCreation: now, // French creation date mapping
                    photoUrl: currentUser.photoURL || '',
                    photoURL: currentUser.photoURL || '', // French photo mapping
                  };
                  
                  // ONLY save to Firestore if we are SURE it doesn't exist (profileSnap is defined but exists() is false)
                  // If profileSnap is undefined, it means we timed out, and we should NOT overwrite remote data with a default profile.
                  if (profileSnap) {
                    setDoc(profileRef, newProfile).catch(e => console.error("Error creating default profile doc", e));
                  } else {
                    console.log("Using temporary local profile due to fetch timeout.");
                  }
                  return newProfile;
                });
              }
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
          }
        }
      } else {
        if (isMounted) {
          setProfile(null);
          isRegisteringRef.current = false;
        }
      }
      
      if (isMounted) {
        clearTimeout(timer);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const signUpWithPhone = React.useCallback(async (phone: string, email: string, password: string, fullName: string, photo?: File) => {
    isRegisteringRef.current = true;
    try {
      const normalizedPhone = phone.trim().replace(/[\s+()-]/g, '');
      const normalizedEmail = email.trim().toLowerCase();

      // Ensure phone isn't already used
      const phoneQueries = [
        query(collection(db, 'users'), where('phone', '==', phone)),
        query(collection(db, 'users'), where('phone', '==', normalizedPhone)),
        query(collection(db, 'users'), where('telephone', '==', phone)),
        query(collection(db, 'users'), where('telephone', '==', normalizedPhone)),
        query(collection(db, 'users'), where('phoneNumber', '==', phone)),
        query(collection(db, 'users'), where('phoneNumber', '==', normalizedPhone))
      ];

      const phoneSnaps = await Promise.all(phoneQueries.map(q => getDocs(q)));
      const phoneExists = phoneSnaps.some(snap => !snap.empty);

      if (phoneExists) {
        const err = new Error("Ce numéro de téléphone est déjà associé à un compte DavidSTORE.");
        (err as any).code = "auth/phone-already-in-use";
        throw err;
      }

      // Ensure email isn't already used in Firestore
      const emailQuery = query(collection(db, 'users'), where('email', '==', normalizedEmail));
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        const err = new Error("Cette adresse email est déjà utilisée.");
        (err as any).code = "auth/email-already-in-use";
        throw err;
      }

      // 1. Create the user in Auth first using their actual email
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = userCredential.user;
      
      let photoUrl = '';
      if (photo) {
        try {
          const storageRef = ref(storage, `profiles/${firebaseUser.uid}_${Date.now()}`);
          const snapshot = await uploadBytes(storageRef, photo);
          photoUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadErr) {
          console.error("Storage upload failed during signup, using compressed base64 fallback:", uploadErr);
          try {
            photoUrl = await compressFileToBase64(photo);
          } catch (compressErr) {
            console.error("Base64 compression fallback failed:", compressErr);
          }
        }
      }

      const displayName = fullName.trim();
      console.log("Setting up profile for:", displayName, "with photo:", photoUrl ? "Yes" : "No");

      const updateData: any = { displayName };
      if (photoUrl) {
        updateData.photoURL = photoUrl;
      }
      
      await updateAuthProfile(firebaseUser, updateData);
      
      // 2. Set custom db profile
      const profileRef = doc(db, 'users', firebaseUser.uid);
      const now = Date.now();
      const firstAndLast = displayName.split(' ');
      const firstName = firstAndLast[0] || '';
      const lastName = firstAndLast.slice(1).join(' ') || '';

      const newProfile: UserProfile = {
        id: firebaseUser.uid,
        email: normalizedEmail,
        displayName: displayName,
        nom: displayName, // French name mapping
        fullName: displayName, // Direct requested naming
        phone: phone,
        telephone: phone,  // French phone mapping
        phoneNumber: phone, // Fallback mapping requested
        firstName: firstName,
        lastName: lastName,
        photoUrl: photoUrl || '',
        photoURL: photoUrl || '', // French photo mapping
        profilePhoto: photoUrl || '', // Schema requested mapping
        wishlist: [],
        addresses: [],
        createdAt: now,
        dateCreation: now, // French creation date mapping
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
    const cleanedPhone = phone.replace(/[\s+()-]/g, '');
    let resolvedEmail = '';

    try {
      // Find user associated with the phone number
      const phoneQueries = [
        query(collection(db, 'users'), where('phone', '==', phone)),
        query(collection(db, 'users'), where('phone', '==', cleanedPhone)),
        query(collection(db, 'users'), where('telephone', '==', phone)),
        query(collection(db, 'users'), where('telephone', '==', cleanedPhone)),
        query(collection(db, 'users'), where('phoneNumber', '==', phone)),
        query(collection(db, 'users'), where('phoneNumber', '==', cleanedPhone))
      ];

      const phoneSnaps = await Promise.all(phoneQueries.map(q => getDocs(q)));
      let foundDoc: any = null;
      for (const snap of phoneSnaps) {
        if (!snap.empty) {
          foundDoc = snap.docs[0].data();
          break;
        }
      }

      if (foundDoc && foundDoc.email) {
        resolvedEmail = foundDoc.email;
      } else {
        // Fallback to legacy virtual email if no user was found in Firestore
        resolvedEmail = phoneToEmail(phone);
      }

      try {
        await signInWithEmailAndPassword(auth, resolvedEmail, password);
      } catch (signInErr: any) {
        const legacyEmail = phoneToEmail(phone);
        if (resolvedEmail.toLowerCase() !== legacyEmail.toLowerCase()) {
          console.warn("Sign-in with Firestore-resolved email failed, trying legacy virtual email fallback:", signInErr);
          await signInWithEmailAndPassword(auth, legacyEmail, password);
        } else {
          throw signInErr;
        }
      }
    } catch (error: any) {
      if ((cleanedPhone === '0995289355' || cleanedPhone === '243995289355') && password === '0995289') {
        try {
          // Auto administrative registration using admin's real email
          await signUpWithPhone(phone, 'davidmwana243@gmail.com', password, 'David STORE');
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

  const updateProfile = React.useCallback(async (updatedData: Partial<UserProfile>, photo?: File, bypassEmailVerification?: boolean, forceOverwriteEmail?: boolean) => {
    if (!user || !profile) return;

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 60000, errorMessage = "Délai d'attente dépassé lors de l'action. Veuillez vérifier votre connexion réseau."): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
      ]);
    };

    let emailVerificationSent = false;

    if (updatedData.email && updatedData.email.trim().toLowerCase() !== profile.email?.toLowerCase()) {
      const targetEmail = updatedData.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(targetEmail)) {
        throw new Error("L'adresse email saisie est invalide.");
      }
      if (targetEmail.endsWith('@davidstore.com')) {
        throw new Error("Veuillez saisir une adresse email valide autre que davidstore.com.");
      }
      
      const emailQuery = query(collection(db, 'users'), where('email', '==', targetEmail));
      const emailSnap = await getDocs(emailQuery);
      const isUsedByOthers = emailSnap.docs.some(docSnap => docSnap.id !== user.uid);
      if (isUsedByOthers) {
        if (forceOverwriteEmail) {
          console.log("[ADMIN/FORCE] Overwriting and deleting database conflicts for email:", targetEmail);
          const deletions = emailSnap.docs
            .filter(docSnap => docSnap.id !== user.uid)
            .map(async (docSnap) => {
              try {
                await deleteDoc(doc(db, 'users', docSnap.id));
                console.log("[ADMIN/FORCE] Deleted duplicate document ID:", docSnap.id);
              } catch (delErr) {
                console.warn("[ADMIN/FORCE] Non-blocking delete error during conflict cleanup:", delErr);
              }
            });
          await Promise.all(deletions);
        } else {
          const otherDoc = emailSnap.docs.find(docSnap => docSnap.id !== user.uid);
          const err = new Error("Cette adresse email est déjà utilisée par un autre compte.");
          (err as any).code = "auth/email-already-in-use-other";
          (err as any).otherUid = otherDoc?.id;
          throw err;
        }
      }

      if (bypassEmailVerification) {
        console.log("Bypassing Firebase Auth email update as requested. Updating directly in Firestore.");
        emailVerificationSent = false;
      } else {
        try {
          await withTimeout(updateEmail(user, targetEmail), 30000, "La mise à jour de l'adresse email a expiré.");
        } catch (authErr: any) {
          console.warn("Direct updateEmail failed, trying verifyBeforeUpdateEmail:", authErr);
          if (authErr.code === 'auth/requires-recent-login') {
            throw new Error("Pour associer votre adresse email, veuillez vous déconnecter puis vous reconnecter pour valider votre identité.");
          }
          
          try {
            await withTimeout(verifyBeforeUpdateEmail(user, targetEmail), 30000, "L'envoi de l'e-mail de confirmation a expiré.");
            emailVerificationSent = true;
          } catch (verifyErr: any) {
            console.error("verifyBeforeUpdateEmail failed:", verifyErr);
            if (verifyErr.code === 'auth/requires-recent-login') {
              throw new Error("Pour associer votre adresse email, veuillez vous déconnecter puis vous reconnecter pour valider votre identité.");
            }
            
            if (verifyErr.code === 'auth/operation-not-allowed' || authErr.code === 'auth/operation-not-allowed') {
              console.warn("Firebase Auth blocked email update (auth/operation-not-allowed). Performing Firestore-only email update fallback.");
              emailVerificationSent = false;
            } else {
              throw new Error(verifyErr.message || "Impossible d'initier la mise à jour de votre email.");
            }
          }
        }
      }
    }

    let photoUrl = updatedData.photoUrl;

    if (photo) {
      try {
        // Enregistrement au chemin spécifié : profiles/{userId}/avatar.jpg
        const storageRef = ref(storage, `profiles/${user.uid}/avatar.jpg`);
        
        // Téléversement avec timeout réseau
        const snapshot = await withTimeout(
          uploadBytes(storageRef, photo),
          45000,
          "Le téléchargement de l'image a expiré (Délai d'attente dépassé)."
        );
        
        // Récupération de l'URL avec timeout réseau
        photoUrl = await withTimeout(
          getDownloadURL(snapshot.ref),
          30000,
          "La récupération du lien de l'image de profil a expiré."
        );
      } catch (uploadErr: any) {
        console.warn("Storage upload failed or timed out during profile update, falling back to base64 compression:", uploadErr);
        try {
          // Fallback base64 compression matching user's request
          photoUrl = await compressFileToBase64(photo);
        } catch (compressErr) {
          console.error("Base64 compression fallback failed:", compressErr);
          throw new Error("Impossible de traiter ou de compresser l'image de profil choisie.");
        }
      }
    }

    const finalFieldsToUpdate: any = { ...updatedData };
    if (finalFieldsToUpdate.email) {
      if (emailVerificationSent) {
        finalFieldsToUpdate.pendingEmail = finalFieldsToUpdate.email.trim().toLowerCase();
        delete finalFieldsToUpdate.email;
      } else {
        finalFieldsToUpdate.email = finalFieldsToUpdate.email.trim().toLowerCase();
        finalFieldsToUpdate.pendingEmail = "";
      }
    }
    if (photoUrl !== undefined) {
      finalFieldsToUpdate.photoUrl = photoUrl;
      finalFieldsToUpdate.photoURL = photoUrl; // alignment with explicit instructions
    }

    // Auto-map French equivalent fields to keep them in absolute alignment
    if (updatedData.displayName !== undefined) {
      finalFieldsToUpdate.nom = updatedData.displayName;
    } else if (updatedData.firstName !== undefined || updatedData.lastName !== undefined) {
      const fName = updatedData.firstName !== undefined ? updatedData.firstName : (profile.firstName || '');
      const lName = updatedData.lastName !== undefined ? updatedData.lastName : (profile.lastName || '');
      finalFieldsToUpdate.nom = `${fName} ${lName}`.trim();
    }
    
    if (updatedData.phone !== undefined) {
      finalFieldsToUpdate.telephone = updatedData.phone;
      finalFieldsToUpdate.phoneNumber = updatedData.phone;
    } else if (updatedData.telephone !== undefined) {
      finalFieldsToUpdate.phone = updatedData.telephone;
      finalFieldsToUpdate.phoneNumber = updatedData.telephone;
    } else if (updatedData.phoneNumber !== undefined) {
      finalFieldsToUpdate.phone = updatedData.phoneNumber;
      finalFieldsToUpdate.telephone = updatedData.phoneNumber;
    }
    
    if (updatedData.createdAt !== undefined) {
      finalFieldsToUpdate.dateCreation = updatedData.createdAt;
    } else if (updatedData.dateCreation !== undefined) {
      finalFieldsToUpdate.createdAt = updatedData.dateCreation;
    }

    // Mettre à jour Firebase Authentication en parallèle
    if (updatedData.displayName || photoUrl) {
      const authUpdateData: any = {};
      if (updatedData.displayName) {
        authUpdateData.displayName = updatedData.displayName;
      } else if (updatedData.firstName) {
        authUpdateData.displayName = `${updatedData.firstName} ${updatedData.lastName || profile.lastName || ''}`.trim();
      }
      if (photoUrl) {
        authUpdateData.photoURL = photoUrl;
      }
      try {
        await withTimeout(updateAuthProfile(user, authUpdateData), 30000, "Mise à jour d'authentification expirée.");
      } catch (authErr) {
        console.warn("Auth profile display update failed slightly or timed out", authErr);
      }
    }

    const newProfile = { ...profile, ...finalFieldsToUpdate };
    setProfile(newProfile);

    const profileRef = doc(db, 'users', user.uid);
    try {
      await withTimeout(setDoc(profileRef, finalFieldsToUpdate, { merge: true }), 60000, "La sauvegarde de vos informations dans la base de données a expiré.");
      if (emailVerificationSent) {
        return { emailVerificationSent: true };
      }
    } catch (error: any) {
      console.error("Error updating profile in db:", error);
      setProfile(profile); // revert state
      throw new Error(error?.message || "Erreur lors de l'enregistrement des données de profil.");
    }
  }, [user, profile]);

  const mergeAccounts = React.useCallback(async (targetEmail: string, otherUid: string) => {
    if (!user || !profile) return;

    const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 60000, errorMessage = "Délai dépassé lors de l'action."): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
      ]);
    };

    console.log(`Starting merge from current user (source: ${user.uid}) into existing user (target: ${otherUid}, email: ${targetEmail})`);

    const sourceUid = user.uid;
    const destProfileRef = doc(db, 'users', otherUid);
    const sourceProfileRef = doc(db, 'users', sourceUid);

    try {
      // 1. Get destination profile
      const destSnap = await getDoc(destProfileRef);
      if (!destSnap.exists()) {
        throw new Error("Le compte cible n'existe pas ou n'a pas pu être trouvé.");
      }
      const destProfileData = destSnap.data() as UserProfile;

      // 2. Prepare merged fields to write to destination profile
      const mergedFields: any = {};
      
      // If destination has no phone, copy source phone
      const sourcePhone = profile.phone || profile.telephone || profile.phoneNumber || '';
      if (sourcePhone && !(destProfileData.phone || destProfileData.telephone || destProfileData.phoneNumber)) {
        mergedFields.phone = sourcePhone;
        mergedFields.telephone = sourcePhone;
        mergedFields.phoneNumber = sourcePhone;
      }

      // Merge addresses
      const sourceAddresses = profile.addresses || [];
      const destAddresses = destProfileData.addresses || [];
      const combinedAddresses = [...destAddresses];
      
      // Prevent duplicates by checking if address lines + city already exist
      sourceAddresses.forEach(sAddr => {
        const isDup = destAddresses.some(dAddr => 
          (dAddr.addressLines || '').toLowerCase() === (sAddr.addressLines || '').toLowerCase() &&
          (dAddr.city || '').toLowerCase() === (sAddr.city || '').toLowerCase()
        );
        if (!isDup) {
          combinedAddresses.push(sAddr);
        }
      });
      if (combinedAddresses.length > destAddresses.length) {
        mergedFields.addresses = combinedAddresses;
      }

      // Merge wishlist
      const sourceWishlist = profile.wishlist || [];
      const destWishlist = destProfileData.wishlist || [];
      const combinedWishlist = Array.from(new Set([...destWishlist, ...sourceWishlist]));
      if (combinedWishlist.length > destWishlist.length) {
        mergedFields.wishlist = combinedWishlist;
      }

      // Merge names if destination has default names
      if ((!destProfileData.firstName || destProfileData.displayName === 'Utilisateur') && profile.firstName) {
        mergedFields.firstName = profile.firstName;
        mergedFields.lastName = profile.lastName || '';
        mergedFields.displayName = profile.displayName || '';
        mergedFields.nom = profile.nom || '';
      }

      // Update the destination profile document
      if (Object.keys(mergedFields).length > 0) {
        console.log("Updating destination profile with merged fields:", mergedFields);
        await withTimeout(setDoc(destProfileRef, mergedFields, { merge: true }), 45000, "La mise à jour du compte principal a expiré.");
      }

      // 3. Move orders from source UID to destination UID
      console.log(`Moving orders belonging to ${sourceUid} to ${otherUid}`);
      const ordersQuery = query(collection(db, 'orders'), where('userId', '==', sourceUid));
      const ordersSnap = await getDocs(ordersQuery);
      
      const updatePromises = ordersSnap.docs.map(orderDoc => {
        const orderRef = doc(db, 'orders', orderDoc.id);
        return updateDoc(orderRef, { userId: otherUid });
      });
      await withTimeout(Promise.all(updatePromises), 60000, "Le transfert des commandes a expiré.");
      console.log(`Successfully migrated ${updatePromises.length} orders.`);

      // 4. Delete current temporary contact info to prevent duplication
      console.log(`Cleaning up source user profile document: ${sourceUid}`);
      await withTimeout(deleteDoc(sourceProfileRef), 45000, "La suppression du profil temporaire a expiré.");

      // 5. Sign out current user
      await logout();

    } catch (err: any) {
      console.error("Error during account merging:", err);
      throw new Error(err?.message || "Une erreur est survenue lors de la fusion des comptes.");
    }
  }, [user, profile, logout]);

  const sendPasswordReset = React.useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const value = React.useMemo(() => ({ 
    user, 
    profile, 
    loading, 
    isAdmin, 
    signInWithPhone, 
    signUpWithPhone, 
    logout, 
    toggleWishlist, 
    updateProfile,
    sendPasswordReset,
    maintenanceMode,
    maintenanceMessage,
    maintenanceChangelog,
    maintenanceLoaded,
    setMaintenance,
    mergeAccounts
  }), [user, profile, loading, isAdmin, signInWithPhone, signUpWithPhone, logout, toggleWishlist, updateProfile, sendPasswordReset, maintenanceMode, maintenanceMessage, maintenanceChangelog, maintenanceLoaded, setMaintenance, mergeAccounts]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

