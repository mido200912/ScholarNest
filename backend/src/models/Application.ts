import mongoose, { Document, Schema } from 'mongoose';

export interface IApplication extends Document {
  user: mongoose.Types.ObjectId;
  scholarship: mongoose.Types.ObjectId;
  status: 'saved' | 'applying' | 'accepted';
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
      enum: ['saved', 'applying', 'accepted'],
      default: 'saved',
    },
  },
  { timestamps: true }
);

// Prevent duplicate entries (one tracking entry per user per scholarship)
applicationSchema.index({ user: 1, scholarship: 1 }, { unique: true });

export const Application = mongoose.model<IApplication>('Application', applicationSchema);
