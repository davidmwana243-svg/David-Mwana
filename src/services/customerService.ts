import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export const getCustomers = async (): Promise<UserProfile[]> => {
  try {
    // To ensure NO users are omitted (since Firestore queries with orderBy omit documents missing the order key),
    // we query all documents and sort them in-memory by whichever timestamp they have.
    const q = collection(db, 'users');
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let needsBatchUpdate = false;

    const users = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      let updatedDataForUser: any = {};
      let needsIndividualUpdate = false;

      // Extract raw values
      const realPhone = data.telephone || data.phone || data.phoneNumber || '';
      const realName = data.nom || data.displayName || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : '');
      const defaultName = data.email ? `Client ${data.email.split('@')[0]}` : 'Utilisateur';
      const actualName = realName || defaultName;
      const creationDate = data.dateCreation || data.createdAt || Date.now();
      const actualPhoto = data.photoURL || data.photoUrl || '';

      // Check if mandatory fields are missing/incorrect in Firestore to self-heal old accounts
      if (!data.nom && actualName) {
        updatedDataForUser.nom = actualName;
        needsIndividualUpdate = true;
      }
      if (!data.telephone && realPhone) {
        updatedDataForUser.telephone = realPhone;
        needsIndividualUpdate = true;
      }
      if (!data.photoURL && actualPhoto) {
        updatedDataForUser.photoURL = actualPhoto;
        needsIndividualUpdate = true;
      }
      if (!data.dateCreation && creationDate) {
        updatedDataForUser.dateCreation = creationDate;
        needsIndividualUpdate = true;
      }

      if (needsIndividualUpdate) {
        const userDocRef = doc(db, 'users', docSnap.id);
        batch.update(userDocRef, updatedDataForUser);
        needsBatchUpdate = true;
      }

      return {
        id: docSnap.id,
        ...data,
        ...updatedDataForUser, // merge newly corrected fields
        nom: actualName,
        displayName: actualName,
        phone: realPhone,
        telephone: realPhone,
        phoneNumber: realPhone,
        photoURL: actualPhoto,
        photoUrl: actualPhoto,
        createdAt: typeof creationDate === 'number' ? creationDate : Date.parse(creationDate) || Date.now(),
        dateCreation: typeof creationDate === 'number' ? creationDate : Date.parse(creationDate) || Date.now(),
      } as UserProfile;
    });

    const filteredUsers = users.filter((user) => {
      const email = user.email || '';
      const photo = user.photoURL || user.photoUrl || '';
      const condition1 = email === '0995289355@davidstore.com' || email === 'davidmwana243@gmail.com';
      const condition2 = email === 'davstore4@gmail.com' && photo.trim() === '';
      return !(condition1 || condition2);
    });

    if (needsBatchUpdate) {
      batch.commit().then(() => {
        console.log("Successfully auto-corrected obsolete client profiles in Firestore.");
      }).catch(err => {
        console.error("Error auto-correcting profiles in background:", err);
      });
    }

    // Sort in-memory by creation date descending
    filteredUsers.sort((a, b) => b.createdAt - a.createdAt);
    return filteredUsers;
  } catch (error) {
    console.error("Error fetching customers", error);
    return [];
  }
};
