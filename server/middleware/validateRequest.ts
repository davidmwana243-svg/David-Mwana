import { Request, Response, NextFunction } from 'express';

export const validateRequest = (schema?: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Generic validation middleware
    if (schema && typeof schema.validate === 'function') {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details?.[0]?.message || 'Données invalides' });
      }
    }
    next();
  };
};
