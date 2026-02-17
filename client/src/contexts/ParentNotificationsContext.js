import React, { createContext, useContext } from 'react';
import useParentRealtimeNotifications from '../hooks/useParentRealtimeNotifications';

const ParentNotificationsContext = createContext(null);

export const ParentNotificationsProvider = ({ children }) => {
  const value = useParentRealtimeNotifications();
  return <ParentNotificationsContext.Provider value={value}>{children}</ParentNotificationsContext.Provider>;
};

export const useParentNotifications = () => {
  const ctx = useContext(ParentNotificationsContext);
  if (!ctx) throw new Error('useParentNotifications must be used within ParentNotificationsProvider');
  return ctx;
};

export default ParentNotificationsContext;

