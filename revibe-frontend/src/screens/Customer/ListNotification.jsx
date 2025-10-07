import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiMessageCircle, FiShoppingBag, FiCheck, FiClock, FiX } from "react-icons/fi";

export default function ListNotification() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, messages, orders
  const [loading, setLoading] = useState(true);

  // Mock data cho notifications
  useEffect(() => {
    const mockNotifications = [
      {
        id: 1,
        type: 'message',
        title: 'Tin nhắn mới',
        message: 'Bạn có tin nhắn mới từ người bán về sản phẩm iPhone 14 Pro',
        time: '2 phút trước',
        read: false,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop',
        sender: 'Nguyễn Văn A',
        productId: 123
      },
      {
        id: 2,
        type: 'order',
        title: 'Đơn hàng đã được xác nhận',
        message: 'Đơn hàng #123456 của bạn đã được xác nhận và đang được chuẩn bị',
        time: '1 giờ trước',
        read: false,
        orderId: '123456',
        status: 'confirmed'
      },
      {
        id: 3,
        type: 'message',
        title: 'Tin nhắn mới',
        message: 'Người mua đã hỏi về tình trạng sản phẩm MacBook Air M2',
        time: '3 giờ trước',
        read: true,
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop',
        sender: 'Trần Thị B',
        productId: 456
      },
      {
        id: 4,
        type: 'order',
        title: 'Đơn hàng đang giao',
        message: 'Đơn hàng #123457 đang được giao đến địa chỉ của bạn',
        time: '5 giờ trước',
        read: true,
        orderId: '123457',
        status: 'shipping'
      },
      {
        id: 5,
        type: 'order',
        title: 'Đơn hàng hoàn thành',
        message: 'Đơn hàng #123455 đã được giao thành công. Hãy đánh giá sản phẩm',
        time: '1 ngày trước',
        read: true,
        orderId: '123455',
        status: 'completed'
      },
      {
        id: 6,
        type: 'message',
        title: 'Tin nhắn mới',
        message: 'Bạn có câu hỏi mới về sản phẩm Samsung Galaxy S24',
        time: '2 ngày trước',
        read: true,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop',
        sender: 'Lê Văn C',
        productId: 789
      }
    ];

    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
  }, []);

  // Filter notifications based on type
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'messages') return notification.type === 'message';
    if (filter === 'orders') return notification.type === 'order';
    return true;
  });

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(notifications.map(notification =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  // Delete notification
  const deleteNotification = (id) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const getNotificationIcon = (type, status) => {
    if (type === 'message') {
      return <FiMessageCircle size={20} color="#3B82F6" />;
    } else if (type === 'order') {
      if (status === 'confirmed') return <FiCheck size={20} color="#10B981" />;
      if (status === 'shipping') return <FiClock size={20} color="#F59E0B" />;
      if (status === 'completed') return <FiCheck size={20} color="#10B981" />;
      return <FiShoppingBag size={20} color="#8B5CF6" />;
    }
    return <FiMessageCircle size={20} color="#6B7280" />;
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'message') {
      navigate(`/customer/chat/${notification.sender}`);
    } else if (notification.type === 'order') {
      navigate(`/customer/orders/${notification.orderId}`);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Đang tải thông báo...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate(-1)}
          style={styles.backButton}
        >
          <FiArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>Thông báo</h1>
        <button
          onClick={markAllAsRead}
          style={styles.markAllButton}
        >
          Đọc tất cả
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterContainer}>
        <button
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFilter('all')}
        >
          Tất cả ({notifications.length})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filter === 'messages' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFilter('messages')}
        >
          Tin nhắn ({notifications.filter(n => n.type === 'message').length})
        </button>
        <button
          style={{
            ...styles.filterButton,
            ...(filter === 'orders' ? styles.filterButtonActive : {})
          }}
          onClick={() => setFilter('orders')}
        >
          Đơn hàng ({notifications.filter(n => n.type === 'order').length})
        </button>
      </div>

      {/* Notifications List */}
      <div style={styles.notificationsList}>
        {filteredNotifications.length === 0 ? (
          <div style={styles.emptyState}>
            <FiMessageCircle size={48} color="#9CA3AF" />
            <p style={styles.emptyText}>Không có thông báo nào</p>
            <p style={styles.emptySubtext}>
              {filter === 'messages' && 'Bạn chưa có tin nhắn mới nào'}
              {filter === 'orders' && 'Bạn chưa có thông báo đơn hàng nào'}
              {filter === 'all' && 'Bạn chưa có thông báo nào'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                ...styles.notificationItem,
                ...(notification.read ? {} : styles.unreadNotification)
              }}
              onClick={() => handleNotificationClick(notification)}
            >
              <div style={styles.notificationContent}>
                <div style={styles.notificationLeft}>
                  {notification.type === 'message' ? (
                    <img
                      src={notification.avatar}
                      alt={notification.sender}
                      style={styles.avatar}
                    />
                  ) : (
                    <div style={styles.iconContainer}>
                      {getNotificationIcon(notification.type, notification.status)}
                    </div>
                  )}
                </div>
                
                <div style={styles.notificationBody}>
                  <div style={styles.notificationHeader}>
                    <h3 style={styles.notificationTitle}>{notification.title}</h3>
                    <span style={styles.notificationTime}>{notification.time}</span>
                  </div>
                  
                  <p style={styles.notificationMessage}>{notification.message}</p>
                  
                  {notification.type === 'message' && (
                    <p style={styles.senderName}>Từ: {notification.sender}</p>
                  )}
                  
                  {notification.type === 'order' && (
                    <div style={styles.orderInfo}>
                      <span style={styles.orderId}>Mã đơn: {notification.orderId}</span>
                      <span style={{
                        ...styles.statusBadge,
                        ...(notification.status === 'completed' ? styles.statusCompleted :
                            notification.status === 'shipping' ? styles.statusShipping :
                            styles.statusConfirmed)
                      }}>
                        {notification.status === 'completed' ? 'Hoàn thành' :
                         notification.status === 'shipping' ? 'Đang giao' :
                         'Đã xác nhận'}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  style={styles.deleteButton}
                >
                  <FiX size={16} />
                </button>
              </div>
              
              {!notification.read && <div style={styles.unreadDot}></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F9FAFB',
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    gap: 16,
  },
  
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #E5E7EB',
    borderTop: '3px solid #3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    margin: 0,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  backButton: {
    background: 'none',
    border: 'none',
    padding: 8,
    cursor: 'pointer',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#374151',
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },

  markAllButton: {
    background: 'none',
    border: 'none',
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 6,
  },

  filterContainer: {
    display: 'flex',
    padding: '12px 20px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
    gap: 8,
  },

  filterButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    transition: 'all 0.2s ease',
  },

  filterButtonActive: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
  },

  notificationsList: {
    padding: '0 0 80px 0',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    margin: '16px 0 8px 0',
  },

  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    margin: 0,
  },

  notificationItem: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #F3F4F6',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s ease',
  },

  unreadNotification: {
    backgroundColor: '#F0F9FF',
  },

  notificationContent: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px 20px',
    gap: 12,
  },

  notificationLeft: {
    flexShrink: 0,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    objectFit: 'cover',
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBody: {
    flex: 1,
    minWidth: 0,
  },

  notificationHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },

  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    margin: 0,
    lineHeight: 1.3,
  },

  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
    flexShrink: 0,
  },

  notificationMessage: {
    fontSize: 14,
    color: '#374151',
    margin: '4px 0 8px 0',
    lineHeight: 1.4,
  },

  senderName: {
    fontSize: 12,
    color: '#6B7280',
    margin: 0,
    fontStyle: 'italic',
  },

  orderInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  orderId: {
    fontSize: 12,
    color: '#6B7280',
  },

  statusBadge: {
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '500',
  },

  statusCompleted: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },

  statusShipping: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },

  statusConfirmed: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },

  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s ease',
  },

  unreadDot: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#EF4444',
  },
};

// CSS animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
