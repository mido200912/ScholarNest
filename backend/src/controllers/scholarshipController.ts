import { Request, Response } from 'express';
import { Scholarship } from '../models/Scholarship';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Application } from '../models/Application';
import { Comment } from '../models/Comment';
import { sendScholarshipNotification, sendNewScholarshipEmail } from '../services/telegramService';

// @desc    Get all APPROVED scholarships with filtering, pagination, and text search
// @route   GET /api/scholarships
// @access  Public
export const getScholarships = async (req: Request, res: Response) => {
  try {
    const { search, country, degree, fundingType, limit = 10, page = 1 } = req.query;
    
    // Only show approved scholarships
    let query: any = { status: 'approved' };

    // 1. Robust Search using Regex (supports partial matches and across all languages/fields)
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { 'title.en': searchRegex },
        { 'title.ar': searchRegex },
        { 'description.en': searchRegex },
        { 'description.ar': searchRegex },
        { 'university.en': searchRegex },
        { 'university.ar': searchRegex },
        { 'country.en': searchRegex },
        { 'country.ar': searchRegex },
        { keywords: searchRegex },
        { fundingType: searchRegex },
        { degree: searchRegex },
      ];
    }

    // 2. Exact Match Filters (if provided explicitly)
    if (country) query['country.en'] = country;
    if (degree) query.degree = degree;
    if (fundingType) query.fundingType = fundingType;

    // 3. Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const scholarships = await Scholarship.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Scholarship.countDocuments(query);

    res.json({
      success: true,
      data: scholarships,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single scholarship by ID
// @route   GET /api/scholarships/:id
// @access  Public
export const getScholarshipById = async (req: Request, res: Response) => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      return res.status(404).json({ success: false, message: 'Scholarship not found' });
    }
    res.json({ success: true, data: scholarship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a scholarship
// @route   POST /api/scholarships
// @access  Private
export const createScholarship = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    
    // Auto-approve if created by admin or assistant
    const status = (userRole === 'admin' || userRole === 'assistant_admin') ? 'approved' : 'pending';

    const newScholarship = new Scholarship({
      ...req.body,
      status,
      submittedBy: req.user?._id
    });
    
    const savedScholarship = await newScholarship.save();

    // Notify admin/assistant_admin via Telegram + Email when a regular user submits
    if (userRole === 'user') {
      const admins = await User.find({ role: { $in: ['admin', 'assistant_admin'] } })
        .select('name email telegramChatId');
      const submitterName = req.user?.name || 'Unknown';
      const scholarshipTitle = req.body.title?.en || 'Untitled';
      const scholarshipUniversity = req.body.university?.en || 'Unknown';

      for (const admin of admins) {
        if (admin.telegramChatId) {
          sendScholarshipNotification(
            admin.telegramChatId,
            scholarshipTitle,
            scholarshipUniversity,
            submitterName,
            savedScholarship._id.toString()
          ).catch(() => {});
        }
        if (admin.email) {
          sendNewScholarshipEmail(
            admin.email,
            scholarshipTitle,
            scholarshipUniversity,
            submitterName
          ).catch(() => {});
        }
      }
    }

    res.status(201).json({ success: true, data: savedScholarship });
  } catch (error: any) {
    console.error('Error creating scholarship:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get pending scholarships
// @route   GET /api/scholarships/pending
// @access  Private/Assistant or Admin
export const getPendingScholarships = async (req: Request, res: Response) => {
  try {
    const scholarships = await Scholarship.find({ status: 'pending' })
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: scholarships });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update scholarship status (Approve/Reject)
// @route   PATCH /api/scholarships/:id/status
// @access  Private/Assistant or Admin
export const updateScholarshipStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const scholarship = await Scholarship.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );

    if (!scholarship) {
      res.status(404).json({ success: false, message: 'Scholarship not found' });
      return;
    }

    res.json({ success: true, data: scholarship });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Update scholarship
// @route   PUT /api/scholarships/:id
// @access  Private/Admin or owner
export const updateScholarship = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      res.status(404).json({ success: false, message: 'Scholarship not found' });
      return;
    }

    const userRole = req.user?.role;
    const userId = req.user?._id?.toString();
    const isOwner = scholarship.submittedBy?.toString() === userId;
    const isAdmin = userRole === 'admin' || userRole === 'assistant_admin';

    if (!isAdmin && !isOwner) {
      res.status(403).json({ success: false, message: 'Not authorized to edit this scholarship' });
      return;
    }

    const updated = await Scholarship.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get my submitted scholarships
// @route   GET /api/scholarships/my
// @access  Private
export const getMyScholarships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scholarships = await Scholarship.find({ submittedBy: req.user?._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: scholarships });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete all scholarships
// @route   DELETE /api/scholarships/all
// @access  Private/Admin
export const deleteAllScholarships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await Scholarship.deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} scholarships.`, data: { deletedCount: result.deletedCount } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk import scholarships from JSON array
// @route   POST /api/scholarships/bulk
// @access  Private/Assistant or Admin
export const bulkCreateScholarships = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { scholarships } = req.body;

    if (!Array.isArray(scholarships) || scholarships.length === 0) {
      res.status(400).json({ success: false, message: 'scholarships must be a non-empty array' });
      return;
    }

    const userRole = req.user?.role;
    const status = (userRole === 'admin' || userRole === 'assistant_admin') ? 'approved' : 'pending';

    const docs = scholarships.map((s: any) => ({
      ...s,
      status,
      submittedBy: req.user?._id,
    }));

    const inserted = await Scholarship.insertMany(docs, { ordered: false });
    res.status(201).json({ success: true, count: inserted.length, data: inserted });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Bulk import failed',
      details: error.writeErrors?.map((e: any) => e.errmsg) ?? [],
    });
  }
};

// @desc    Get matched scholarships based on user's smart profile
// @route   GET /api/scholarships/matches
// @access  Private
export const getMatchedScholarships = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    // Fetch user profile
    const user = await User.findById(userId).select('major targetCountries gpa');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userMajor = user.major?.toLowerCase().trim() || '';
    const userTargetCountries = (user.targetCountries || []).map(c => c.toLowerCase().trim());

    if (!userMajor && userTargetCountries.length === 0) {
      return res.json({ 
        success: true, 
        data: [], 
        message: 'Complete your Smart Profile to get personalized matches' 
      });
    }

    // Fetch all approved scholarships
    const scholarships = await Scholarship.find({ status: 'approved' });

    // Calculate match scores
    const scoredScholarships = scholarships.map(scholarship => {
      let score = 0;
      const maxScore = 100;

      // Country match: 50% weight
      const scholarshipCountry = scholarship.country?.en?.toLowerCase().trim() || '';
      if (userTargetCountries.length > 0 && scholarshipCountry) {
        if (userTargetCountries.includes(scholarshipCountry)) {
          score += 50;
        }
      }

      // Major match: 30% weight
      if (userMajor) {
        const scholarshipMajors = (scholarship.majors || []).map(m => m.toLowerCase().trim());
        const scholarshipTitle = scholarship.title?.en?.toLowerCase() || '';
        const scholarshipDesc = scholarship.description?.en?.toLowerCase() || '';
        const scholarshipKeywords = (scholarship.keywords || []).map(k => k.toLowerCase().trim());
        
        // Check in majors array
        const majorInMajors = scholarshipMajors.some(m => 
          m.includes(userMajor) || userMajor.includes(m)
        );
        
        // Check in title, description, or keywords
        const majorInText = scholarshipTitle.includes(userMajor) 
          || scholarshipDesc.includes(userMajor)
          || scholarshipKeywords.some(k => k.includes(userMajor) || userMajor.includes(k));
        
        if (majorInMajors || majorInText) {
          score += 30;
        }
      }

      // Additional bonus: funding type match (Fully Funded = +10)
      if (scholarship.fundingType === 'Fully Funded') {
        score += 10;
      }

      // Additional bonus: degree level match if user has GPA (indicates academic level)
      if (user.gpa) {
        score += 10;
      }

      const matchPercentage = Math.min(score, maxScore);

      return {
        ...scholarship.toObject(),
        matchPercentage,
        matchReasons: {
          countryMatch: userTargetCountries.includes(scholarshipCountry),
          majorMatch: userMajor && (scholarship.majors || []).some(m => 
            m.toLowerCase().includes(userMajor) || userMajor.includes(m.toLowerCase())
          ) || scholarship.title?.en?.toLowerCase().includes(userMajor) || 
          scholarship.description?.en?.toLowerCase().includes(userMajor)
        }
      };
    });

    // Filter scholarships with match percentage >= 50% and sort by match percentage descending
    const matchedScholarships = scoredScholarships
      .filter(s => s.matchPercentage >= 50)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    res.json({
      success: true,
      data: matchedScholarships,
      count: matchedScholarships.length
    });
  } catch (error: any) {
    console.error('Error fetching matched scholarships:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get ALL scholarships (admin/assistant) - all statuses
// @route   GET /api/scholarships/all
// @access  Private/Assistant or Admin
export const getAllScholarshipsAdmin = async (req: Request, res: Response) => {
  try {
    const { search, status, limit = 20, page = 1 } = req.query;
    
    let query: any = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { 'title.en': searchRegex },
        { 'title.ar': searchRegex },
        { 'university.en': searchRegex },
        { 'university.ar': searchRegex },
        { 'country.en': searchRegex },
        { 'country.ar': searchRegex },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const scholarships = await Scholarship.find(query)
      .populate('submittedBy', 'name email')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Scholarship.countDocuments(query);

    res.json({
      success: true,
      data: scholarships,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @route   DELETE /api/scholarships/:id
// @access  Private/Assistant or Admin
export const deleteScholarship = async (req: Request, res: Response): Promise<void> => {
  try {
    const scholarship = await Scholarship.findById(req.params.id);
    if (!scholarship) {
      res.status(404).json({ success: false, message: 'Scholarship not found' });
      return;
    }

    const scholarshipId = scholarship._id;

    // Cascade delete all related data
    await Promise.all([
      Application.deleteMany({ scholarship: scholarshipId }),
      Comment.deleteMany({ scholarship: scholarshipId }),
      User.updateMany(
        { savedScholarships: scholarshipId },
        { $pull: { savedScholarships: scholarshipId } }
      ),
    ]);

    // Delete the scholarship itself
    await Scholarship.findByIdAndDelete(scholarshipId);

    res.json({ success: true, message: 'Scholarship and all related data deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
