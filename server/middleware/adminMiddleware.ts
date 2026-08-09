import { Request, Response, NextFunction } from 'express';
import { isAdmin as checkIsAdmin } from './authMiddleware';

export const adminMiddleware = checkIsAdmin;
