import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Create context
const SocketContext = createContext();

// Get API base URL
const getApiBaseUrl = () => {
  const API_BASE = process.env.REACT_APP_API_URL || '/api';
  // Convert to Socket.IO URL (remove /api if present)
  return API_BASE.replace('/api', '');
};

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Get auth token
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

  // Connect to Socket.IO server
  const connectSocket = () => {
    if (socketRef.current?.connected) return;

    const token = getAuthToken();
    if (!token) return;

    const API_BASE = getApiBaseUrl();
    socketRef.current = io(API_BASE, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });
  };

  // Disconnect socket
  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  };

  // Join conversation room
  const joinConversation = (conversationId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('join_conversation', conversationId);
    }
  };

  // Leave conversation room
  const leaveConversation = (conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_conversation', conversationId);
    }
  };

  // Send message via Socket.IO
  const sendMessage = (conversationId, text, attachments = []) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      socketRef.current.emit('send_message', {
        conversationId,
        text,
        attachments
      });

      // Set up temporary listeners for response
      const onMessageSent = (message) => {
        socketRef.current.off('message_sent', onMessageSent);
        resolve(message);
      };

      const onError = (error) => {
        socketRef.current.off('error', onError);
        reject(new Error(error.message || error));
      };

      socketRef.current.once('message_sent', onMessageSent);
      socketRef.current.once('error', onError);

      // Timeout after 10 seconds
      setTimeout(() => {
        socketRef.current.off('message_sent', onMessageSent);
        socketRef.current.off('error', onError);
        reject(new Error('Send message timeout'));
      }, 10000);
    });
  };

  // Mark conversation as read
  const markAsRead = (conversationId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('mark_read', conversationId);
    }
  };

  // Start typing indicator
  const startTyping = (conversationId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('typing_start', conversationId);
    }
  };

  // Stop typing indicator
  const stopTyping = (conversationId) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('typing_stop', conversationId);
    }
  };

  // Set up listeners for incoming events
  useEffect(() => {
    if (socketRef.current) {
      // Listen for new messages
      socketRef.current.on('new_message', (message) => {
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('socket:new_message', { detail: message }));
      });

      // Listen for typing indicators
      socketRef.current.on('user_typing', (data) => {
        window.dispatchEvent(new CustomEvent('socket:user_typing', { detail: data }));
      });

      socketRef.current.on('user_stopped_typing', (data) => {
        window.dispatchEvent(new CustomEvent('socket:user_stopped_typing', { detail: data }));
      });

      // Listen for conversation updates
      socketRef.current.on('conversation_updated', (conversationId) => {
        window.dispatchEvent(new CustomEvent('socket:conversation_updated', { detail: conversationId }));
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new_message');
        socketRef.current.off('user_typing');
        socketRef.current.off('user_stopped_typing');
        socketRef.current.off('conversation_updated');
      }
    };
  }, [connected]);

  // Auto-connect on mount if we have auth token
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      connectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, []);

  // Reconnect when auth token changes
  useEffect(() => {
    const handleTokenChange = () => {
      disconnectSocket();
      const token = getAuthToken();
      if (token) {
        connectSocket();
      }
    };

    window.addEventListener('storage', handleTokenChange);
    return () => window.removeEventListener('storage', handleTokenChange);
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    connectSocket,
    disconnectSocket,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
