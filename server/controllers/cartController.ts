import { Request, Response } from 'express';

export const getCart = async (req: Request, res: Response) => {
  res.json({ success: true, cart: [] });
};

export const updateCart = async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Panier mis à jour' });
};
