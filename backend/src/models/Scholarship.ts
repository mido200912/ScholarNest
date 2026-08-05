import mongoose, { Document, Schema } from 'mongoose';

export interface IScholarship extends Document {
  title: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  country: {
    ar: string;
    en: string;
  };
  university: {
    ar: string;
    en: string;
  };
  degree: 'Bachelor' | 'Master' | 'PhD' | 'Other';
  fundingType: 'Fully Funded' | 'Partially Funded';
  majors: string[]; 
  deadline: Date;
  link: string;
  image?: string;
  keywords: string[]; // For fast text search and filtering
  status: 'pending' | 'approved' | 'rejected';
  submittedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scholarshipSchema = new Schema<IScholarship>(
  {
    title: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    description: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    country: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    university: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    degree: {
      type: String,
      enum: ['Bachelor', 'Master', 'PhD', 'Other'],
      required: true,
    },
    fundingType: {
      type: String,
      enum: ['Fully Funded', 'Partially Funded'],
      required: true,
    },
    majors: [
      {
        type: String,
      },
    ],
    deadline: {
      type: Date,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    image: {
      type: String, // URL from Cloudinary
      default: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop',
    },
    keywords: [
      {
        type: String, // E.g. "USA", "Full Ride", "Medicine"
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Adding Text Index for powerful text search using MongoDB Atlas Search
scholarshipSchema.index({
  'title.ar': 'text',
  'title.en': 'text',
  'description.ar': 'text',
  'description.en': 'text',
  'keywords': 'text',
});

export const Scholarship = mongoose.model<IScholarship>('Scholarship', scholarshipSchema);
