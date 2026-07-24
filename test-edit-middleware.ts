import fs from 'fs';
let content = fs.readFileSync('server/middleware/authMiddleware.ts', 'utf8');
content = content.replace(
  `export const isAdmin = (req: Request, res: Response, next: NextFunction) => {`,
  `import { getDb } from '../firebase/index.js';\nexport const isAdmin = async (req: Request, res: Response, next: NextFunction) => {`
);
content = content.replace(
  `const isAuthorizedPhone = userPhone.endsWith('812345678') || 
                            userPhone.endsWith('999999999') || 
                            userPhone.endsWith('995289355');`,
  `const isAuthorizedPhone = userPhone.endsWith('812345678') || 
                            userPhone.endsWith('999999999') || 
                            userPhone.endsWith('995289355');
  
  let isFirestoreAdmin = false;
  if (user?.uid) {
    try {
      const db = getDb();
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        const profilePhone = (data?.phone || data?.telephone || '').replace(/[\\s+()-]/g, '');
        if (
          profilePhone.endsWith('812345678') || 
          profilePhone.endsWith('999999999') || 
          profilePhone.endsWith('995289355') ||
          data?.email?.includes('davidmwana') ||
          data?.email?.includes('davstore') ||
          data?.email?.includes('admin')
        ) {
          isFirestoreAdmin = true;
        }
      }
    } catch (e) {
      console.error('Error checking Firestore for admin status', e);
    }
  }`
);

content = content.replace(
  `if (user && (user.admin === true || user.role === 'admin' || isAuthorizedEmail || isAuthorizedPhone)) {`,
  `if (user && (user.admin === true || user.role === 'admin' || isAuthorizedEmail || isAuthorizedPhone || isFirestoreAdmin)) {`
);

fs.writeFileSync('server/middleware/authMiddleware.ts', content);
