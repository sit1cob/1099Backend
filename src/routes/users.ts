import { Router } from 'express';
import { authenticateJWT, type AuthenticatedRequest } from '../middleware/auth';
import { UserModel } from '../models/user';
import { password as pwdUtil } from '../utils/password';

export const usersRouter = Router();

// POST /api/users/change-password
// Body: { currentPassword, newPassword }
usersRouter.post('/change-password', authenticateJWT(), async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }

    const userId = req.user!.userId;
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const ok = await pwdUtil.compare(currentPassword, user.passwordHash as unknown as string);
    if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    user.passwordHash = await pwdUtil.hash(newPassword) as any;
    (user as any).passwordChangedAt = new Date();
    await user.save();

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Failed to change password' });
  }
});
