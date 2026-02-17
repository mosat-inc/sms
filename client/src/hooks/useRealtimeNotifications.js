import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Cache for reducing duplicate requests
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds cache

const useRealtimeNotifications = () => {
  const { api } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Debug loading state changes
  useEffect(() => {
    console.log(`Loading state changed to: ${loading}`);
  }, [loading]);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  
  const pollIntervalRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const isActiveRef = useRef(true);
  const requestInProgressRef = useRef(false);
  const [pollInterval, setPollInterval] = useState(30000); // Start with 30 seconds

  // Cache helper functions
  const getCacheKey = useCallback((params) => {
    return `notifications_${JSON.stringify(params)}`;
  }, []);

  const getCachedData = useCallback((key) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    cache.delete(key);
    return null;
  }, []);

  const setCachedData = useCallback((key, data) => {
    cache.set(key, { data, timestamp: Date.now() });
  }, []);

  // Adaptive polling based on errors, rate limiting, and activity
  const updatePollInterval = useCallback(() => {
    let newInterval;
    
    // If we're rate limited, use much longer interval
    if (rateLimitedUntil && Date.now() < rateLimitedUntil) {
      newInterval = Math.max(300000, 60000 * Math.pow(2, consecutiveErrors)); // 5 minutes minimum, exponential backoff
    } else if (consecutiveErrors > 0) {
      // Exponential backoff for errors: 1min, 2min, 4min, 8min (max)
      newInterval = Math.min(60000 * Math.pow(2, consecutiveErrors), 480000); // Max 8 minutes
    } else if (!lastFetch) {
      newInterval = 60000; // 1 minute for first load
    } else {
      const timeSinceLastFetch = Date.now() - lastFetch;
      if (timeSinceLastFetch < 300000) {
        newInterval = 60000; // 1 minute for recent activity
      } else if (timeSinceLastFetch < 1800000) {
        newInterval = 120000; // 2 minutes for medium activity
      } else {
        newInterval = 300000; // 5 minutes for quiet periods
      }
    }
    
    if (newInterval !== pollInterval) {
      console.log(`Updating poll interval from ${pollInterval}ms to ${newInterval}ms (errors: ${consecutiveErrors})`);
      setPollInterval(newInterval);
    }
  }, [lastFetch, rateLimitedUntil, pollInterval, consecutiveErrors]);

  // Debounced fetch to prevent rapid consecutive calls
  const debouncedFetchNotifications = useCallback((force = false, delay = 1000) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchNotificationsImmediate(force);
    }, delay);
  }, []);

  const fetchNotificationsImmediate = useCallback(async (force = false) => {
    // Prevent multiple simultaneous requests
    if (requestInProgressRef.current && !force) {
      console.log('Request already in progress, skipping...');
      return;
    }
    
    // Don't prevent requests if currently loading unless it's a recent request
    if (loading && !force && lastFetch && (Date.now() - lastFetch < 5000)) {
      console.log('Recent request still loading, skipping...');
      return;
    }
    
    // Check if we're still rate limited
    if (rateLimitedUntil && Date.now() < rateLimitedUntil && !force) {
      console.log('Still rate limited, skipping fetch');
      return;
    }
    
    try {
      requestInProgressRef.current = true;
      setLoading(true);
      setError(null);
      
      // Set a timeout to prevent stuck loading states
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Loading timeout reached, forcing loading state to false');
        setLoading(false);
        requestInProgressRef.current = false;
      }, 15000); // 15 second timeout
      
      // Always fetch active announcements for reliability
      const params = {
        status: 'active'
      };
      
      // Only use timestamp filtering if we have a recent lastFetch to avoid missing data
      if (lastFetch && !force && (Date.now() - lastFetch < 600000)) { // Only if within 10 minutes
        params.since = new Date(lastFetch - 30000).toISOString(); // Subtract 30 seconds for overlap
      }
      
      // Check cache first (unless force refresh)
      const cacheKey = getCacheKey(params);
      if (!force) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          console.log('Using cached notification data');
          setNotifications(cachedData.notifications || []);
          setUnreadCount(cachedData.unreadCount || 0);
          setConsecutiveErrors(0); // Reset error count on successful cache hit
          setLoading(false); // Ensure loading is cleared for cached data
          requestInProgressRef.current = false;
          
          // Clear loading timeout for cached data
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          return;
        }
      }
      
      const [announcementsResponse, unreadCountResponse] = await Promise.all([
        api.get('/api/communication/announcements', { params }),
        api.get('/api/communication/announcements/unread-count')
      ]);
      
      let newNotifications = [];
      let newUnreadCount = 0;
      
      if (announcementsResponse.data.success) {
        const newAnnouncements = announcementsResponse.data.data;
        
        if (force || !lastFetch) {
          // Full refresh
          newNotifications = newAnnouncements;
        } else {
          // Merge new/updated announcements
          setNotifications(prevNotifications => {
            const updatedNotifications = [...prevNotifications];
            
            newAnnouncements.forEach(newNotification => {
              const existingIndex = updatedNotifications.findIndex(n => n.id === newNotification.id);
              if (existingIndex >= 0) {
                // Update existing notification
                updatedNotifications[existingIndex] = newNotification;
              } else {
                // Add new notification at the beginning
                updatedNotifications.unshift(newNotification);
              }
            });
            
            newNotifications = updatedNotifications;
            return updatedNotifications;
          });
        }
        
        setNotifications(newNotifications);
      }
      
      if (unreadCountResponse.data.success) {
        newUnreadCount = unreadCountResponse.data.unread_count;
        setUnreadCount(newUnreadCount);
      }
      
      // Cache the successful response
      setCachedData(cacheKey, {
        notifications: newNotifications,
        unreadCount: newUnreadCount
      });
      
      setLastFetch(Date.now());
      setConsecutiveErrors(0); // Reset error count on success
      setRateLimitedUntil(null); // Clear rate limit status on success
      
      // Update polling interval based on activity
      updatePollInterval();
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setConsecutiveErrors(prev => prev + 1);
      
      // Handle rate limiting errors gracefully
      if (error.response?.status === 429 || error.response?.data?.error === 'RATE_LIMIT_EXCEEDED') {
        console.warn('Rate limit exceeded for notifications, will retry later');
        // Set rate limited timeout - increase based on consecutive errors
        const rateLimitDuration = Math.min(300000, 120000 * Math.pow(1.5, consecutiveErrors)); // 2min to 5min max
        setRateLimitedUntil(Date.now() + rateLimitDuration);
        setError({ type: 'rate_limit', message: 'Too many requests. Slowing down...' });
      } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        setError({ type: 'network', message: 'Network error. Will retry...' });
      } else {
        setError({ type: 'general', message: 'Failed to fetch notifications' });
        console.error('Notification fetch failed:', error.message);
      }
      
      // Update polling interval to implement backoff
      updatePollInterval();
    } finally {
      // Clear loading timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Always clear loading state and request flag
      setLoading(false);
      requestInProgressRef.current = false;
      
      // Add a small delay to prevent rapid re-polling on errors
      if (consecutiveErrors > 0) {
        await new Promise(resolve => setTimeout(resolve, Math.min(5000, 1000 * consecutiveErrors)));
      }
    }
  }, [api, loading, lastFetch, rateLimitedUntil, getCacheKey, getCachedData, setCachedData, updatePollInterval, consecutiveErrors]);

  // Public fetch function with debouncing
  const fetchNotifications = useCallback((force = false) => {
    if (force) {
      // Immediate fetch for force refresh
      fetchNotificationsImmediate(force);
    } else {
      // Debounced fetch for regular polling
      debouncedFetchNotifications(force, 2000);
    }
  }, [debouncedFetchNotifications, fetchNotificationsImmediate]);

  // Reliable polling setup with better cleanup
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    if (isActiveRef.current && pollInterval > 0) {
      console.log(`Setting up notification polling with ${pollInterval}ms interval`);
      pollIntervalRef.current = setInterval(() => {
        if (isActiveRef.current && !requestInProgressRef.current && !loading) {
          console.log('Polling for notifications...');
          fetchNotifications();
        } else {
          console.log('Skipping poll - request in progress or loading');
        }
      }, pollInterval);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [pollInterval, fetchNotifications, loading]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      requestInProgressRef.current = false;
      // Clear cache on unmount to prevent stale data
      cache.clear();
    };
  }, []);

  // Handle page visibility for efficient polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (document.hidden) {
        // Page is hidden, clear interval to save resources
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      } else {
        // Page is visible, resume polling and fetch immediately
        fetchNotifications(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchNotifications]);

  // Initial fetch - run only once on mount
  useEffect(() => {
    let mounted = true;
    
    const initialFetch = async () => {
      if (mounted) {
        await fetchNotifications(true);
      }
    };
    
    initialFetch();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to run only once

  // Emergency reset function to clear stuck loading states
  const resetLoadingState = useCallback(() => {
    console.log('Emergency loading state reset triggered');
    setLoading(false);
    requestInProgressRef.current = false;
    setError(null);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);
  
  // Auto-reset if loading state persists too long
  useEffect(() => {
    if (loading) {
      const resetTimer = setTimeout(() => {
        console.warn('Loading state persisted for 30 seconds, auto-resetting');
        resetLoadingState();
      }, 30000);
      
      return () => clearTimeout(resetTimer);
    }
  }, [loading, resetLoadingState]);
  
  // Exposed methods
  const refresh = useCallback(() => {
    resetLoadingState();
    fetchNotifications(true);
  }, [fetchNotifications, resetLoadingState]);
  
  const markAsRead = useCallback(async (announcementId) => {
    try {
      await api.post(`/api/communication/announcements/${announcementId}/mark-read`);
      
      // Update local state immediately
      setNotifications(prev => prev.map(notification => 
        notification.id === announcementId 
          ? { ...notification, is_read: true }
          : notification
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      throw error;
    }
  }, [api]);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(unreadNotifications.map(notification => 
        api.post(`/api/communication/announcements/${notification.id}/mark-read`)
      ));
      
      // Update local state
      setNotifications(prev => prev.map(notification => ({ 
        ...notification, 
        is_read: true 
      })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }, [api, notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    resetLoadingState,
    isRateLimited: rateLimitedUntil && Date.now() < rateLimitedUntil
  };
};

export default useRealtimeNotifications;
