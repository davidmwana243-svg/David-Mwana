import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { UserProfile } from '../models/types';

export const getCustomers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as UserProfile;
      return {
        ...data,
        displayName: data.displayName && data.displayName !== 'Utilisateur'
          ? data.displayName
          : (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : 'Utilisateur')
      };
    });
  } catch (error) {
    console.error("Error fetching customers", error);
    return [];
  }
};
