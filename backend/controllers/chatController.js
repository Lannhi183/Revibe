import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { ok, created } from '../utils/response.js';

/**
 * Get all conversations for the current user
 */
export const getConversations = async (req, res) => {
  const userId = req.user.sub;
  console.log('getConversations - userId:', userId);

  const conversations = await Conversation.aggregate([
    {
      $match: {
        participants: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'participants',
        foreignField: '_id',
        as: 'participants_data'
      }
    },
    {
      $lookup: {
        from: 'listings',
        localField: 'listing_ids',
        foreignField: '_id',
        as: 'listings'
      }
    },
    {
      $project: {
        _id: 1,
        participants: 1,
        participants_data: 1,
        participant_roles: 1,
        // Return all listings with basic info (keep first image only for UI efficiency)
        listings: {
          $map: {
            input: '$listings',
            as: 'listing',
            in: { _id: '$$listing._id', title: '$$listing.title', images: { $slice: ['$$listing.images', 1] } }
          }
        },
        last_message: 1,
        unread: 1,
        created_at: 1,
        updated_at: 1
      }
    },
    { $sort: { 'last_message.at': -1, updated_at: -1 } }
  ]);

  console.log('getConversations - conversations:', conversations);

  // Get unread counts and other person data for the current user
  const myConversations = conversations.map(conv => {
    // Find current user's index in participants
    const currentUserIndex = conv.participants.findIndex(p => p.toString() === userId);
    const otherUserIndex = currentUserIndex === 0 ? 1 : 0;

    // Get other person's data
    const currentUserData = conv.participants_data[currentUserIndex];
    const otherPersonData = conv.participants_data[otherUserIndex];

    // Get current user's unread count
    const myUnreadCount = conv.unread[currentUserIndex] || 0;

    // Get participant roles
    const currentUserRole = conv.participant_roles?.[userId.toString()] || 'buyer';
    const otherPersonRole = conv.participant_roles?.[conv.participants[otherUserIndex]?.toString()] || 'seller';

    return {
      _id: conv._id,
      other_person: {
        _id: otherPersonData._id,
        name: otherPersonData.name,
        avatar_url: otherPersonData.avatar_url,
        role: otherPersonRole
      },
      current_user_role: currentUserRole,
      listings: conv.listings,
      last_message: conv.last_message,
      unread_count: myUnreadCount,
      created_at: conv.created_at,
      updated_at: conv.updated_at
    };
  });

  ok(res, myConversations);
};

/**
 * Start or get a conversation between two users (optionally related to listings)
 */
export const startConversation = async (req, res) => {
  const { user_ids, listing_ids = [], initiator_role = 'buyer' } = req.body;

  // Validate input: need exactly 2 user IDs
  if (!user_ids || !Array.isArray(user_ids) || user_ids.length !== 2) {
    return res.status(400).json({ error: 'Must provide exactly 2 user IDs' });
  }

  const [user1, user2] = user_ids;

  // First try to find an existing conversation between these two users
  let conversation = await Conversation.findOne({
    participants: { $all: [user1, user2], $size: 2 }
  });

  if (conversation) {
    // If conversation exists and we have new listing_ids to add, append them
    if (listing_ids.length > 0) {
      const newListings = listing_ids.filter(id =>
        !conversation.listing_ids.some(existingId => existingId.toString() === id)
      );
      if (newListings.length > 0) {
        conversation.listing_ids.push(...newListings);
        await conversation.save();
      }
    }
  } else {
    // Create new conversation
    const participantRoles = new Map();
    // Determine roles based on initiator and target users
    const targetRole = initiator_role === 'buyer' ? 'seller' : 'buyer';
    participantRoles.set(user1.toString(), initiator_role);
    participantRoles.set(user2.toString(), targetRole);

    conversation = await Conversation.create({
      participants: [user1, user2],
      listing_ids,
      participant_roles: Object.fromEntries(participantRoles),
      last_message: null,
      unread: { 0: 0, 1: 0 }
    });
  }

  // Get full conversation data with populated fields
  conversation = await Conversation.findById(conversation._id)
    .populate('participants', 'name avatar_url')
    .populate('listing_ids', 'title images');

  ok(res, conversation);
};

/**
 * Get messages for a conversation (with pagination)
 */
export const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  // Verify user has access to this conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  // Check if current user is a participant
  const isParticipant = conversation.participants.some(p => p.toString() === req.user.sub);
  if (!isParticipant) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const messages = await Message.find({ conversation_id: conversationId })
    .populate('sender_id', 'name avatar_url')
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Message.countDocuments({ conversation_id: conversationId });

  ok(res, messages.reverse(), {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

/**
 * Send a message (HTTP API - for when WebSocket is not available)
 */
export const sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { text, attachments = [] } = req.body;
  const sender_id = req.user.sub;

  // Verify conversation exists and user has access
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  // Check if current user is a participant
  const senderIndex = conversation.participants.findIndex(p => p.toString() === sender_id);
  if (senderIndex === -1) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Create message
  const message = await Message.create({
    conversation_id: conversationId,
    sender_id,
    text,
    attachments
  });

  // Find the other participant's index (the one who should receive the unread increment)
  const receiverIndex = senderIndex === 0 ? 1 : 0;

  // Update conversation's last message and increment unread count for the receiver
  await Conversation.findByIdAndUpdate(conversationId, {
    last_message: { text, at: new Date() },
    $inc: { [`unread.${receiverIndex}`]: 1 }
  });

  // Populate sender info for response
  await message.populate('sender_id', 'name avatar_url');

  // Emit socket event if socket.io is available
  if (global.io) {
    global.io.to(`conversation_${conversationId}`).emit('new_message', message);
  }

  created(res, message);
};

/**
 * Mark messages as read in a conversation
 */
export const markAsRead = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.sub;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  // Check if current user is a participant
  const userIndex = conversation.participants.findIndex(p => p.toString() === userId);
  if (userIndex === -1) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Reset unread count for current user using participant index
  await Conversation.findByIdAndUpdate(conversationId, {
    [`unread.${userIndex}`]: 0
  });

  // Emit socket event to update unread counts
  if (global.io) {
    global.io.to(`conversation_${conversationId}`).emit('conversation_updated', conversationId);
  }

  ok(res, { message: 'Messages marked as read' });
};

/**
 * Get unread count for current user
 */
export const getUnreadCount = async (req, res) => {
  const userId = req.user.sub;

  // First, get all conversations for this user and calculate which index they are in each conversation
  const conversations = await Conversation.find({
    participants: userId
  }).select('participants unread');

  let totalUnread = 0;

  conversations.forEach(conv => {
    const userIndex = conv.participants.findIndex(p => p.toString() === userId);
    if (userIndex !== -1) {
      totalUnread += conv.unread[userIndex] || 0;
    }
  });

  ok(res, { total_unread: totalUnread });
};
