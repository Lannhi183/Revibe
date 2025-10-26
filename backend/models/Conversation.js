import { Schema, model, baseOpts } from './_helpers.js';

const ConversationSchema = new Schema({
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true, required: true }],
  listing_ids: [{ type: Schema.Types.ObjectId, ref: 'Listing' }],
  last_message: { text: String, at: Date },
  // Unread counts keyed by participant index (0: participants[0], 1: participants[1])
  unread: {
    0: { type: Number, default: 0 },
    1: { type: Number, default: 0 }
  },
  // Track participant roles for UI display purposes
  participant_roles: {
    type: Map,
    of: String, // 'buyer' or 'seller'
    default: new Map()
  }
}, baseOpts);

// Ensure participants array always has exactly 2 participants
ConversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Conversation must have exactly 2 participants'));
  }
  // Ensure participants are sorted for consistent querying
  this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
  next();
});

// Indexes for efficient lookups
// ConversationSchema.index({ participants: 1 }); // Main index for uniqueness
ConversationSchema.index({ listing_ids: 1 });
ConversationSchema.index({ 'participants': 1, 'last_message.at': -1 }); // For conversations sorting

// Ensure uniqueness: prevent duplicate conversations between same participants
ConversationSchema.index({ participants: 1 }, { unique: true });

export const Conversation = model('Conversation', ConversationSchema);
