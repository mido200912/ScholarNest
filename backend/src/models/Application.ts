import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
  user: mongoose.Types.ObjectId;
  scholarship: mongoose.Types.ObjectId;
  status: 'saved' | 'applying' | 'under_review' | 'interview' | 'accepted' | 'rejected';
  appliedAt?: Date;
  reviewedAt?: Date;
  interviewAt?: Date;
  timeline: {
    status: string;
    date: Date;
    note?: string;
  }[];
  documents: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scholarship: {
      type: Schema.Types.ObjectId,
      ref: 'Scholarship',
      required: true,
    },
    status: {
      type: String,
      enum: ['saved', 'applying', 'under_review', 'interview', 'accepted', 'rejected'],
      default: 'saved',
    },
    appliedAt: Date,
    reviewedAt: Date,
    interviewAt: Date,
    timeline: [{
      status: { type: String, required: true },
      date: { type: Date, default: Date.now },
      note: String,
    }],
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

// Prevent duplicate entries (one tracking entry per user per scholarship)
applicationSchema.index({ user: 1, scholarship: 1 }, { unique: true });

export const Application = mongoose.model<IApplication>('Application', applicationSchema);
