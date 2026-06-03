
export const formatSafeDate = (dateVal: any): string => {
  if (!dateVal) return 'Date inconnue';
  
  try {
    let d: Date;
    
    // Handle Firestore Timestamp
    if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
      d = new Date(dateVal.seconds * 1000);
    } 
    // Handle Firestore Timestamp specifically if it has toDate()
    else if (dateVal && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    }
    // Handle strings, numbers, or Date objects
    else {
      d = new Date(dateVal);
    }
    
    if (isNaN(d.getTime())) {
      return 'Date invalide';
    }
    
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date:", e, dateVal);
    return 'Erreur date';
  }
};

export const formatSafeDateShort = (dateVal: any): string => {
  if (!dateVal) return '...';
  
  try {
    let d: Date;
    if (dateVal && typeof dateVal === 'object' && 'seconds' in dateVal) {
      d = new Date(dateVal.seconds * 1000);
    } else if (dateVal && typeof dateVal.toDate === 'function') {
      d = dateVal.toDate();
    } else {
      d = new Date(dateVal);
    }
    
    if (isNaN(d.getTime())) return '...';
    
    return d.toLocaleDateString('fr-FR');
  } catch (e) {
    return '...';
  }
};
