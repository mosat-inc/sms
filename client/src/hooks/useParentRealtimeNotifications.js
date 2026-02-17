import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import parentApi from '../services/parentHttp';

const CACHE_TTL_MS = 20000;
const cache = new Map();

const getCache = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.v;
};

const setCache = (key, value) => {
  cache.set(key, { t: Date.now(), v: value });
};

const useParentRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchNow = useCallback(
    async (force = false) => {
      try {
        setLoading(true);
        setError(null);

        // Always fetch the full active feed (limited on the backend) to avoid losing older
        // announcements when using incremental polling.
        const key = `parent_announcements:all`;

        if (!force) {
          const cached = getCache(key);
          if (cached) {
            setNotifications(cached.notifications);
            setUnreadCount(cached.unreadCount);
            return;
          }
        }

        const [feedRes, countRes] = await Promise.all([
          parentApi.get('/api/parent/announcements', { params: { status: 'active' } }),
          parentApi.get('/api/parent/announcements/unread-count'),
        ]);

        const nextNotifications = feedRes.data?.data || [];
        const nextUnread = Number(countRes.data?.unread_count || 0);

        setNotifications(nextNotifications);
        setUnreadCount(nextUnread);
        setCache(key, { notifications: nextNotifications, unreadCount: nextUnread });
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNow(true);
    const onFocus = () => fetchNow(false);
    window.addEventListener('focus', onFocus);
    intervalRef.current = setInterval(() => fetchNow(false), 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNow]);

  const markAsRead = useCallback(async (id) => {
    await parentApi.post(`/api/parent/announcements/${id}/mark-read`);
    await fetchNow(true);
  }, [fetchNow]);

  const markAllAsRead = useCallback(async () => {
    await parentApi.post('/api/parent/announcements/mark-all-read');
    await fetchNow(true);
  }, [fetchNow]);

  const refresh = useCallback(() => fetchNow(true), [fetchNow]);

  const stable = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, loading, error, refresh, markAsRead, markAllAsRead]
  );

  return stable;
};

export default useParentRealtimeNotifications;
