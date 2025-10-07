import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';

/**
 * Initialize Socket.IO server
 * @param {http.Server} server - HTTP server instance
 * @returns {SocketServer} Socket.IO server instance
 */
export function initSocketIO(server) {
  const io = new SocketServer(server, {
    cors: {
      origin: "*", // Configure for production
      methods: ["GET", "POST"]
    }
  });

  // Make io available globally for routes
  global.io = io;

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Verify user has access to this conversation
        const conversation = await Conversation.findById(conversationId);

        if (conversation && conversation.participants.some(p => p.toString() === socket.userId)) {
          socket.join(`conversation_${conversationId}`);
          socket.emit('joined_conversation', conversationId);
          console.log(`User ${socket.userId} joined conversation ${conversationId}`);
        } else {
          socket.emit('error', 'Access denied to conversation');
        }
      } catch (error) {
        socket.emit('error', 'Failed to join conversation');
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      socket.emit('left_conversation', conversationId);
    });

    // Send message via Socket.IO
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text, attachments = [] } = data;

        // Verify conversation exists and user has access
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('error', 'Conversation not found');
        }

        if (!conversation.participants.some(p => p.toString() === socket.userId)) {
          return socket.emit('error', 'Access denied');
        }

        // Create message
        const message = await Message.create({
          conversation_id: conversationId,
          sender_id: socket.userId,
          text,
          attachments
        });

        // Find the sender's index and increment unread count for the other participant
        const senderIndex = conversation.participants.findIndex(p => p.toString() === socket.userId);
        const receiverIndex = senderIndex === 0 ? 1 : 0;

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
          last_message: { text, at: new Date() },
          $inc: { [`unread.${receiverIndex}`]: 1 }
        });

        // Populate sender info
        await message.populate('sender_id', 'name avatar_url');

        // Send to all users in the conversation except sender
        socket.to(`conversation_${conversationId}`).emit('new_message', message);

        // Send confirmation to sender
        socket.emit('message_sent', message);

      } catch (error) {
        socket.emit('error', 'Failed to send message');
      }
    });

    // Typing indicators - broadcast to all participants in the conversation
    socket.on('typing_start', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (conversation && conversation.participants.some(p => p.toString() === socket.userId)) {
          socket.to(`conversation_${conversationId}`).emit('user_typing', {
            user_id: socket.userId,
            conversation_id: conversationId
          });
        }
      } catch (error) {
        console.error('Typing start error:', error);
      }
    });

    socket.on('typing_stop', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (conversation && conversation.participants.some(p => p.toString() === socket.userId)) {
          socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
            user_id: socket.userId,
            conversation_id: conversationId
          });
        }
      } catch (error) {
        console.error('Typing stop error:', error);
      }
    });

    // Mark as read
    socket.on('mark_read', async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) return;

        // Only update if user has access
        if (conversation.participants.some(p => p.toString() === socket.userId)) {

          const userIndex = conversation.participants.findIndex(p => p.toString() === socket.userId);

          await Conversation.findByIdAndUpdate(conversationId, {
            [`unread.${userIndex}`]: 0
          });

          // Notify all users in conversation about read status update
          io.to(`conversation_${conversationId}`).emit('conversation_updated', conversationId);
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
}
