import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useParentNotifications } from '../contexts/ParentNotificationsContext';

const ParentAnnouncementToasts = ({ onOpenAnnouncements }) => {
  const { notifications } = useParentNotifications();
  const announcedIdsRef = useRef(new Set());

  useEffect(() => {
    if (!Array.isArray(notifications) || notifications.length === 0) return;

    const candidates = notifications
      .filter((n) => n && !n.is_read && n.id)
      .slice(0, 5)
      .filter((n) => !announcedIdsRef.current.has(n.id));

    if (!candidates.length) return;

    candidates.forEach((n) => {
      announcedIdsRef.current.add(n.id);
      toast.info(`New announcement: ${n.title || 'Announcement'}`, {
        autoClose: 5000,
        onClick: () => {
          if (typeof onOpenAnnouncements === 'function') onOpenAnnouncements();
        },
      });
    });
  }, [notifications, onOpenAnnouncements]);

  return null;
};

export default ParentAnnouncementToasts;

