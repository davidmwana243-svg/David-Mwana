// @ts-ignore - The file is generated dynamically
import configData from '../../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase/app';

export const firebaseConfig = configData;
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
