import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: { en: string; ar: string };
  message: { en: string; ar: string };
  isRead: boolean;
  type: 'deadline' | 'system';
  link?: string;
  createdAt: Date;
}

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    message: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    isRead: { type: Boolean, default: false },
    type: { type: String, enum: ['deadline', 'system'], default: 'system' },
    link: { type: String }, // Optional link to redirect user when clicked
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
