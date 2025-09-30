import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { NotificationModel } from '../models/notification';

export const notificationsRouter = Router();

notificationsRouter.use(authenticateJWT());

// GET /api/notifications?limit=20
notificationsRouter.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
    const items = await NotificationModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ success: true, data: items });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id;
    await NotificationModel.updateOne({ _id: id, userId }, { $set: { readAt: new Date() } });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to update notification' });
  }
});

// PATCH /api/notifications/read-all
notificationsRouter.patch('/read-all', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const result = await NotificationModel.updateMany({ userId, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    return res.json({ success: true, matched: (result as any).matchedCount, modified: (result as any).modifiedCount });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/clear
notificationsRouter.delete('/clear', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.userId;
    const result = await NotificationModel.deleteMany({ userId });
    return res.json({ success: true, deleted: (result as any).deletedCount });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to clear notifications' });
  }
});
