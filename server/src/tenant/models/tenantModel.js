import mongoose, { Schema } from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../../utils/constants.js';

const tenantSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  // imageUrl: { type: String, trim: true }, // Cloudinary URL — replaced by S3 key
  imageKey: {
    type: String,
    trim: true
  },
  status: {
    type: Boolean,
    default: true
  },
  contacts: {
    email: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    }
  },
  location: {
    type: Object
  },
  address :{
    type: String,
    trim: true
  },
  /**
   * Additional kiosk languages enabled by this tenant (English is always available).
   * Values must be entries from SUPPORTED_LANGUAGES (excluding 'English').
   */
  kioskLanguages: {
    type: [String],
    default: [],
    validate: {
      validator: function (arr) {
        return arr.every(
          (lang) => lang !== 'English' && SUPPORTED_LANGUAGES.includes(lang)
        );
      },
      message: 'One or more languages are invalid or English cannot be added here',
    },
  },
}, { timestamps: true });

tenantSchema.index({ name: 1 }, { unique: true });
tenantSchema.index({ "contacts.email": 1 }, { unique: true, sparse: true });
tenantSchema.index({ "contacts.phoneNumber": 1 }, { unique: true, sparse: true });

export const Tenant = mongoose.model("Tenant", tenantSchema);
