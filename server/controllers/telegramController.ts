import { Request, Response } from 'express';

export const handleTelegramWebhook = async (req: Request, res: Response) => {
  res.json({ ok: true });
};
