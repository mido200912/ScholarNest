import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  user: mongoose.Types.ObjectId;
  type: 'deadline_7days' | 'deadline_3days' | 'deadline_1day' | 'new_scholarship' | 'status_change';
  title: { en: string; ar: string };
  message: { en: string; ar: string };
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['deadline_7days', 'deadline_3days', 'deadline_1day', 'new_scholarship', 'status_change'],
      required: true,
    },
    title: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    message: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    link: String,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

alertSchema.index({ user: 1, createdAt: -1 });
alertSchema.index({ user: 1, isRead: 1 });

export const Alert = mongoose.model<IAlert>('Alert', alertSchema);
