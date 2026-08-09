import { Request, Response } from 'express';

export const sendNotification = async (req: Request, res: Response) => {
  const { token, title, body } = req.body;
  res.json({ success: true, message: 'Notification envoyée' });
};
