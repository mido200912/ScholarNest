import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Scholarship } from '../models/Scholarship';
import { User } from '../models/User';
import { Application } from '../models/Application';

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalScholarships,
      activeScholarships,
      expiredScholarships,
      pendingScholarships,
      rejectedScholarships,
      approvedScholarships,
      totalApplications,
      savedApplications,
      applyingApplications,
      acceptedApplications,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisWeek } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      Scholarship.countDocuments(),
      Scholarship.countDocuments({ deadline: { $gte: now }, status: 'approved' }),
      Scholarship.countDocuments({ deadline: { $lt: now } }),
      Scholarship.countDocuments({ status: 'pending' }),
      Scholarship.countDocuments({ status: 'rejected' }),
      Scholarship.countDocuments({ status: 'approved' }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'saved' }),
      Application.countDocuments({ status: 'applying' }),
      Application.countDocuments({ status: 'accepted' }),
    ]);

    // Top countries
    const topCountries = await Scholarship.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$country.en', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Top universities
    const topUniversities = await Scholarship.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$university.en', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Degrees distribution
    const degreesDistribution = await Scholarship.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$degree', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Funding types distribution
    const fundingDistribution = await Scholarship.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$fundingType', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          today: newUsersToday,
          thisWeek: newUsersThisWeek,
          thisMonth: newUsersThisMonth,
        },
        scholarships: {
          total: totalScholarships,
          active: activeScholarships,
          expired: expiredScholarships,
          pending: pendingScholarships,
          rejected: rejectedScholarships,
          approved: approvedScholarships,
        },
        applications: {
          total: totalApplications,
          saved: savedApplications,
          applying: applyingApplications,
          accepted: acceptedApplications,
        },
        topCountries,
        topUniversities,
        degreesDistribution,
        fundingDistribution,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get daily user registration stats (last 30 days)
// @route   GET /api/admin/stats/daily
// @access  Private/Admin
export const getDailyStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyApplications = await Application.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: { dailyUsers, dailyApplications },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export scholarships as CSV data
// @route   GET /api/admin/export/scholarships
// @access  Private/Admin
export const exportScholarships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scholarships = await Scholarship.find()
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });

    const csv = [
      'Title,University,Country,Degree,Funding Type,Deadline,Status,Created At',
      ...scholarships.map(s =>
        `"${s.title.en}","${s.university.en}","${s.country.en}","${s.degree}","${s.fundingType}","${s.deadline}","${s.status}","${s.createdAt}"`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=scholarships.csv');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export users as CSV data
// @route   GET /api/admin/export/users
// @access  Private/Admin
export const exportUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    const csv = [
      'Name,Email,Role,Country,Major,Created At',
      ...users.map(u =>
        `"${u.name}","${u.email}","${u.role}","${u.country || ''}","${u.major || ''}","${u.createdAt}"`
      ),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
