import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount
} from '../controllers/chatController.js';

const r = Router();

// Apply authentication to all chat routes
r.use(requireAuth);

// Get all conversations for current user
r.get('/conversations', getConversations);

// Get unread message count
r.get('/unread-count', getUnreadCount);

// Start or get a conversation
r.post('/conversations/start', startConversation);

// Get messages for a conversation
r.get('/conversations/:conversationId/messages', getMessages);

// Send message to a conversation
r.post('/conversations/:conversationId/messages', sendMessage);

// Mark messages as read in a conversation
r.patch('/conversations/:conversationId/read', markAsRead);

export default r;
