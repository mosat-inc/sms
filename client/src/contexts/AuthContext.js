import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import api from '../services/http';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenCheckInterval, setTokenCheckInterval] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolCode, setSchoolCode] = useState(null);

  // Function to extract school context from JWT token
  const extractSchoolContext = useCallback((token) => {
    if (!token) return { schoolId: null, schoolCode: null };
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        schoolId: payload.schoolId || null,
        schoolCode: payload.schoolCode || null
      };
    } catch (error) {
      console.error('Error extracting school context:', error);
      return { schoolId: null, schoolCode: null };
    }
  }, []);

  // Function to clear auth data
  const clearAuthData = useCallback(() => {
    setUser(null);
    setToken(null);
    setSchoolId(null);
    setSchoolCode(null);
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
    
    // Clear token check interval
    if (tokenCheckInterval) {
      clearInterval(tokenCheckInterval);
      setTokenCheckInterval(null);
    }
  }, [tokenCheckInterval]);

  // Function to check if token is expired
  const isTokenExpired = useCallback((token) => {
    if (!token) return true;
    
    try {
      // Decode JWT token (basic decode, not verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired (with 5 minute buffer)
      return payload.exp < (currentTime + 300);
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }, []);

  // Function to validate token with server
  const validateToken = useCallback(async () => {
    const storedToken = localStorage.getItem('sms_token');
    
    if (!storedToken) {
      clearAuthData();
      return false;
    }
    
    // Check if token is expired locally first
    if (isTokenExpired(storedToken)) {
      console.log('Token expired locally, logging out...');
      toast.warning('Your session has expired. Please login again.');
      clearAuthData();
      return false;
    }
    
    try {
      // Validate with server
      const response = await api.get('/api/auth/validate-token');
      if (response.data.success) {
        return true;
      } else {
        clearAuthData();
        return false;
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('Token invalid on server, logging out...');
        clearAuthData();
        return false;
      }
      // Don't logout on network errors, just log them
      console.error('Token validation error:', error);
      return true; // Assume valid to avoid unnecessary logouts on network issues
    }
  }, [clearAuthData, isTokenExpired]);

  // Setup token validation interval
  const setupTokenValidation = useCallback(() => {
    // Clear existing interval
    if (tokenCheckInterval) {
      clearInterval(tokenCheckInterval);
    }
    
    // Setup new interval to check token every 5 minutes
    const interval = setInterval(() => {
      validateToken();
    }, 5 * 60 * 1000); // 5 minutes
    
    setTokenCheckInterval(interval);
  }, [validateToken, tokenCheckInterval]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('sms_token');
      const storedUser = localStorage.getItem('sms_user');

      if (storedToken && storedUser) {
        // Validate token before setting auth state
        const isValid = await validateToken();
        
        if (isValid) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Extract and set school context from token
          const { schoolId: sid, schoolCode: scode } = extractSchoolContext(storedToken);
          setSchoolId(sid);
          setSchoolCode(scode);
          
          setupTokenValidation(); // Start token validation interval
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []); // Remove dependencies to avoid infinite loops

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
    };
  }, [tokenCheckInterval]);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password
      });

      if (response.data.success) {
        // Check if user must change password
        if (response.data.must_change_password) {
          console.log('🔐 AuthContext: Temporary password login response:', {
            has_data_field: !!response.data.data,
            has_direct_user: !!response.data.user,
            has_direct_token: !!response.data.token,
            has_nested_user: !!response.data.data?.user,
            has_nested_token: !!response.data.data?.token
          });
          
          // Don't store user/token in localStorage for temp password users
          // Just return the response with temp token for password change
          return {
            success: true,
            must_change_password: true,
            user: response.data.data?.user || response.data.user,
            token: response.data.data?.token || response.data.token,
            message: response.data.message
          };
        }
        
        const { user, token } = response.data.data || response.data;
        
        // Store in state and localStorage for regular login
        setUser(user);
        setToken(token);
        
        // Extract and set school context from token
        const { schoolId: sid, schoolCode: scode } = extractSchoolContext(token);
        setSchoolId(sid);
        setSchoolCode(scode);
        
        localStorage.setItem('sms_token', token);
        localStorage.setItem('sms_user', JSON.stringify(user));
        
        // Setup token validation after successful login
        setupTokenValidation();
        
        return { success: true, user, token, schoolId: sid, schoolCode: scode };
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  };


  // Register function
  const register = async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Store in state and localStorage
        setUser(user);
        setToken(token);
        
        // Extract and set school context from token
        const { schoolId: sid, schoolCode: scode } = extractSchoolContext(token);
        setSchoolId(sid);
        setSchoolCode(scode);
        
        localStorage.setItem('sms_token', token);
        localStorage.setItem('sms_user', JSON.stringify(user));
        
        // Setup token validation after successful registration
        setupTokenValidation();
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await api.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth data and intervals
      clearAuthData();
    }
  };

  // Get user profile
  const getProfile = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      if (response.data.success) {
        setUser(response.data.data.user);
        localStorage.setItem('sms_user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  };

  // Update profile function
  const updateProfile = async (profileData) => {
    try {
      console.log('Frontend: Sending profile update:', profileData);
      console.log('Frontend: Current user before update:', user);
      
      const response = await api.put('/api/auth/profile', profileData);
      
      console.log('Frontend: Profile update response:', response.data);
      
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        
        console.log('Frontend: Updated user from response:', updatedUser);
        console.log('Frontend: User has required auth fields?', {
          hasId: !!updatedUser.id,
          hasUsername: !!updatedUser.username,
          hasRole: !!updatedUser.role
        });
        
        console.log('Frontend: Teaching assignment data in response:', {
          subjects_taught: updatedUser.subjects_taught,
          subjects_type: typeof updatedUser.subjects_taught,
          subjects_length: updatedUser.subjects_taught?.length,
          classes_assigned: updatedUser.classes_assigned,
          classes_type: typeof updatedUser.classes_assigned,
          classes_length: updatedUser.classes_assigned?.length
        });
        
        // Update state and localStorage
        setUser(updatedUser);
        localStorage.setItem('sms_user', JSON.stringify(updatedUser));
        
        console.log('Frontend: State and localStorage updated');
        console.log('Frontend: Current user state after update:', user);
        
        // For better consistency, also refresh the profile from the server
        // This ensures we have the most up-to-date data
        try {
          console.log('Frontend: Refreshing profile from server...');
          await getProfile();
          console.log('Frontend: Profile refreshed successfully');
        } catch (refreshError) {
          console.warn('Failed to refresh profile after update:', refreshError);
          // Continue with the updated data we already have
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Frontend: Profile update error:', error);
      throw error.response?.data || { message: 'Profile update failed' };
    }
  };

  // Change password function (for existing users)
  const changePassword = async (passwordData) => {
    try {
      const response = await api.put('/api/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password change failed' };
    }
  };
  
  // First-time password change function (for users with temporary passwords)
  const firstPasswordChange = async (passwordData) => {
    try {
      const response = await api.put('/api/auth/first-password-change', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Password setup failed' };
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    schoolId,
    schoolCode,
    login,
    register,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    firstPasswordChange,
    api // Export api instance for other components to use
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
