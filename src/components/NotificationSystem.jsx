// src/components/NotificationSystem.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, AlertCircle, XCircle, X, Info } from 'lucide-react';

// Context para notificaciones
const NotificationContext = createContext();

// Hook para usar notificaciones
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return context;
};

// Tipos de notificación
const NOTIFICATION_TYPES = {
  success: {
    icon: CheckCircle,
    className: 'notification-success',
    defaultDuration: 4000
  },
  error: {
    icon: XCircle,
    className: 'notification-error',
    defaultDuration: 6000
  },
  warning: {
    icon: AlertCircle,
    className: 'notification-warning',
    defaultDuration: 5000
  },
  info: {
    icon: Info,
    className: 'notification-info',
    defaultDuration: 4000
  }
};

// Componente individual de notificación
const NotificationItem = ({ notification, onClose }) => {
  const { icon: Icon, className } = NOTIFICATION_TYPES[notification.type];

  return (
    <div className={`notification ${className} notification-enter`}>
      <div className="notification-content">
        <Icon size={20} className="notification-icon" />
        <div className="notification-text">
          {notification.title && (
            <div className="notification-title">{notification.title}</div>
          )}
          <div className="notification-message">{notification.message}</div>
        </div>
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="notification-close"
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// Container de notificaciones
const NotificationContainer = ({ notifications, removeNotification }) => {
  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};

// Provider de notificaciones
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, title = null, duration = null) => {
    const id = Date.now() + Math.random();
    const typeConfig = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.info;
    const finalDuration = duration || typeConfig.defaultDuration;

    const notification = {
      id,
      type,
      message,
      title,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-remover después del tiempo especificado
    if (finalDuration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, finalDuration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Métodos de conveniencia
  const success = useCallback((message, title = null, duration = null) => {
    return addNotification('success', message, title, duration);
  }, [addNotification]);

  const error = useCallback((message, title = null, duration = null) => {
    return addNotification('error', message, title, duration);
  }, [addNotification]);

  const warning = useCallback((message, title = null, duration = null) => {
    return addNotification('warning', message, title, duration);
  }, [addNotification]);

  const info = useCallback((message, title = null, duration = null) => {
    return addNotification('info', message, title, duration);
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

// PropTypes
NotificationItem.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
    message: PropTypes.string.isRequired,
    title: PropTypes.string,
    timestamp: PropTypes.number.isRequired
  }).isRequired,
  onClose: PropTypes.func.isRequired
};

NotificationContainer.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
      message: PropTypes.string.isRequired,
      title: PropTypes.string,
      timestamp: PropTypes.number.isRequired
    })
  ).isRequired,
  removeNotification: PropTypes.func.isRequired
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default NotificationProvider;