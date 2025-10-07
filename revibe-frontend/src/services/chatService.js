/**
 * Chat API Service - Calls backend chat endpoints
 */

import { io } from 'socket.io-client';

// Socket state
let socket = null;
let connected = false;

// Get API base URL from environment or default
const API_BASE = process.env.REACT_APP_API_URL || '/api';

/**
 * Get auth token from localStorage
 */
const getAuthHeader = () => {
  const authData = localStorage.getItem('revibe_auth');
  if (!authData) return {};

  try {
    const parsed = JSON.parse(authData);
    // Support both camelCase and snake_case keys
    const token = parsed.accessToken || parsed.access_token || parsed.token || parsed?.user?.accessToken;
    if (token) return { 'Authorization': `Bearer ${token}` };
  } catch (e) {
    console.warn('Invalid auth data in localStorage:', e);
  }

  return {};
};

/**
 * Get auth token for socket
 */
const getAuthToken = () => {
  const authData = localStorage.getItem('revibe_auth');
  if (!authData) return null;

  try {
    const parsed = JSON.parse(authData);
    return parsed.accessToken || parsed.access_token || parsed.token || parsed?.user?.accessToken;
  } catch (e) {
    return null;
  }
};

/**
 * Get Socket.IO URL
 */
const getSocketUrl = () => {
  // Socket.IO is at the root server path, not under /api
  if (API_BASE.startsWith('http')) {
    // Absolute URL - extract origin
    try {
      const url = new URL(API_BASE);
      return url.origin;
    } catch (e) {
      return window.location.origin; // fallback
    }
  } else {
    // Relative URL - return root
    return '/';
  }
};

/**
 * Initialize Socket.IO connection
 */
export const initSocket = () => {
  if (socket?.connected) return socket;

  const token = getAuthToken();
  if (!token) return null;

  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    connected = true;
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    connected = false;
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    connected = false;
  });

  return socket;
};

/**
 * Disconnect Socket.IO
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connected = false;
  }
};

/**
 * Join conversation room for real-time updates
 */
export const joinConversation = (conversationId) => {
  if (socket && connected) {
    socket.emit('join_conversation', conversationId);
  }
};

/**
 * Leave conversation room
 */
export const leaveConversation = (conversationId) => {
  if (socket) {
    socket.emit('leave_conversation', conversationId);
  }
};

/**
 * Send message via Socket.IO
 */
export const sendMessageSocket = (conversationId, text, attachments = []) => {
  return new Promise((resolve, reject) => {
    if (!socket || !connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    socket.emit('send_message', { conversationId, text, attachments });

    const onMessageSent = (message) => {
      socket.off('message_sent', onMessageSent);
      resolve(message);
    };

    const onError = (error) => {
      socket.off('error', onError);
      reject(new Error(error.message || error));
    };

    socket.once('message_sent', onMessageSent);
    socket.once('error', onError);

    setTimeout(() => {
      socket.off('message_sent', onMessageSent);
      socket.off('error', onError);
      reject(new Error('Send message timeout'));
    }, 10000);
  });
};

/**
 * Send message (prefer Socket.IO, fallback to REST)
 */
export const sendMessage = async (conversationId, text, attachments = []) => {
  try {
    if (connected && socket) {
      return await sendMessageSocket(conversationId, text, attachments);
    }
  } catch (error) {
    console.warn('Socket send failed, using REST API:', error.message);
  }

  // Fallback to REST API
  return apiRequest(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text, attachments }),
  });
};

/**
 * Mark conversation as read
 */
export const markAsRead = (conversationId) => {
  if (socket && connected) {
    socket.emit('mark_read', conversationId);
  }
};

/**
 * Start typing indicator
 */
export const startTyping = (conversationId) => {
  if (socket && connected) {
    socket.emit('typing_start', conversationId);
  }
};

/**
 * Stop typing indicator
 */
export const stopTyping = (conversationId) => {
  if (socket && connected) {
    socket.emit('typing_stop', conversationId);
  }
};

/**
 * Listen for socket events with callbacks
 */
export const setupSocketListeners = (callbacks) => {
  if (!socket) return () => {};

  // Set up listeners
  socket.on('new_message', callbacks.onNewMessage || (() => {}));
  socket.on('user_typing', callbacks.onUserTyping || (() => {}));
  socket.on('user_stopped_typing', callbacks.onUserStoppedTyping || (() => {}));
  socket.on('conversation_updated', callbacks.onConversationUpdated || (() => {}));

  // Return cleanup function
  return () => {
    socket.off('new_message');
    socket.off('user_typing');
    socket.off('user_stopped_typing');
    socket.off('conversation_updated');
  };
};

/**
 * Get socket connection status
 */
export const getSocketStatus = () => ({ socket, connected });

/**
 * Generic API request helper
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers,
    },
    cache: "no-store", // Prevent browser caching to avoid 304 responses for dynamic data
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // Try to parse JSON either for success or error handling
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = json.message || json.error || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    // Normalize API shape: backend commonly returns { data, meta }
    // Return the inner data if present, otherwise the parsed JSON
    return Object.prototype.hasOwnProperty.call(json, 'data') ? json.data : json;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
};

/**
 * Chat API methods
 */
export const chatAPI = {
  /**
   * Get all conversations for current user
   */
  getConversations: () =>
    apiRequest('/chat/conversations'),

  /**
   * Get unread message count
   */
  getUnreadCount: () =>
    apiRequest('/chat/unread-count'),

  /**
   * Start or get a conversation between users
   * @param {string[]} userIds - Array of user IDs [user1, user2]
   * @param {string[]} listingIds - Optional array of listing IDs
   * @param {string} initiatorRole - Role of the person starting the conversation ('buyer'/'seller')
   */
  startConversation: (userIds, listingIds = [], initiatorRole = 'buyer') =>
    apiRequest('/chat/conversations/start', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: userIds,
        listing_ids: listingIds,
        initiator_role: initiatorRole,
      }),
    }),

  /**
   * Get messages for a conversation
   * @param {string} conversationId
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Messages per page
   */
  getMessages: (conversationId, page = 1, limit = 50) =>
    apiRequest(`/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),

  /**
   * Send a message
   * @param {string} conversationId
   * @param {string} text - Message content
   * @param {string[]} attachments - Optional file URLs
   */
  sendMessage: (conversationId, text, attachments = []) =>
    apiRequest(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        attachments,
      }),
    }),

  /**
   * Mark messages as read
   * @param {string} conversationId
   */
  markAsRead: (conversationId) =>
    apiRequest(`/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
    }),
};

export default chatAPI;
