import { User } from '../models/User';

const BADGES = {
  scholarship_hunter: { id: 'scholarship_hunter', name: 'Scholarship Hunter', icon: '🎯', description: 'Saved 10 scholarships', threshold: 10 },
  pro_applicant: { id: 'pro_applicant', name: 'Pro Applicant', icon: '📋', description: 'Applied to 5 scholarships', threshold: 5 },
  profile_master: { id: 'profile_master', name: 'Profile Master', icon: '⭐', description: 'Completed your profile', threshold: 1 },
  community_star: { id: 'community_star', name: 'Community Star', icon: '💬', description: 'Posted 10 comments', threshold: 10 },
  first_save: { id: 'first_save', name: 'First Step', icon: '🎉', description: 'Saved your first scholarship', threshold: 1 },
  first_apply: { id: 'first_apply', name: 'Applicant', icon: '📝', description: 'Applied for the first time', threshold: 1 },
};

const POINTS = {
  save: 10,
  apply: 25,
  complete_profile: 100,
  comment: 5,
  first_save_bonus: 50,
  first_apply_bonus: 75,
};

function getLevel(points: number): string {
  if (points >= 1000) return 'Platinum';
  if (points >= 500) return 'Gold';
  if (points >= 200) return 'Silver';
  return 'Bronze';
}

export const awardPoints = async (userId: string, action: keyof typeof POINTS) => {
  try {
    const points = POINTS[action];
    if (!points) return;

    const user = await User.findById(userId);
    if (!user) return;

    const newPoints = user.points + points;
    const newLevel = getLevel(newPoints);

    const updateData: any = { points: newPoints, level: newLevel };

    // Award badges based on actions
    const existingBadgeIds = user.badges.map((b: any) => b.id);

    if (action === 'save') {
      const savedCount = await require('../models/Application').Application.countDocuments({ user: userId });
      if (savedCount >= BADGES.first_save.threshold && !existingBadgeIds.includes('first_save')) {
        updateData.$push = { badges: { ...BADGES.first_save, earnedAt: new Date() } };
      }
      if (savedCount >= BADGES.scholarship_hunter.threshold && !existingBadgeIds.includes('scholarship_hunter')) {
        updateData.$push = { badges: { ...BADGES.scholarship_hunter, earnedAt: new Date() } };
      }
    }

    if (action === 'apply') {
      const appliedCount = await require('../models/Application').Application.countDocuments({ user: userId, status: { $in: ['applying', 'accepted'] } });
      if (appliedCount >= BADGES.first_apply.threshold && !existingBadgeIds.includes('first_apply')) {
        updateData.$push = { badges: { ...BADGES.first_apply, earnedAt: new Date() } };
      }
      if (appliedCount >= BADGES.pro_applicant.threshold && !existingBadgeIds.includes('pro_applicant')) {
        updateData.$push = { badges: { ...BADGES.pro_applicant, earnedAt: new Date() } };
      }
    }

    if (action === 'complete_profile') {
      if (!existingBadgeIds.includes('profile_master')) {
        updateData.$push = { badges: { ...BADGES.profile_master, earnedAt: new Date() } };
      }
    }

    await User.findByIdAndUpdate(userId, updateData);
  } catch (error) {
    console.error('Error awarding points:', error);
  }
};
