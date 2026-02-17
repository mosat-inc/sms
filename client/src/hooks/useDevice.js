import { useState, useEffect } from 'react';

// Device breakpoints (in pixels)
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  laptop: 1024,
  desktop: 1200,
  largeDesktop: 1440
};

// Device type detection
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet', 
  LAPTOP: 'laptop',
  DESKTOP: 'desktop',
  LARGE_DESKTOP: 'largeDesktop'
};

// Get device type based on screen width
const getDeviceType = (width) => {
  if (width < BREAKPOINTS.mobile) return DEVICE_TYPES.MOBILE;
  if (width < BREAKPOINTS.tablet) return DEVICE_TYPES.MOBILE;
  if (width < BREAKPOINTS.laptop) return DEVICE_TYPES.TABLET;
  if (width < BREAKPOINTS.desktop) return DEVICE_TYPES.LAPTOP;
  if (width < BREAKPOINTS.largeDesktop) return DEVICE_TYPES.DESKTOP;
  return DEVICE_TYPES.LARGE_DESKTOP;
};

// Get orientation
const getOrientation = (width, height) => {
  return width > height ? 'landscape' : 'portrait';
};

// Detect if device has touch support
const hasTouchSupport = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
};

// Main device detection hook
export const useDevice = () => {
  const [device, setDevice] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1024,
        height: 768,
        deviceType: DEVICE_TYPES.LAPTOP,
        isMobile: false,
        isTablet: false,
        isLaptop: true,
        isDesktop: false,
        isLargeDesktop: false,
        orientation: 'landscape',
        hasTouch: false,
        isPortrait: false,
        isLandscape: true
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = getDeviceType(width);
    const orientation = getOrientation(width, height);
    const hasTouch = hasTouchSupport();

    return {
      width,
      height,
      deviceType,
      isMobile: deviceType === DEVICE_TYPES.MOBILE,
      isTablet: deviceType === DEVICE_TYPES.TABLET,
      isLaptop: deviceType === DEVICE_TYPES.LAPTOP,
      isDesktop: deviceType === DEVICE_TYPES.DESKTOP,
      isLargeDesktop: deviceType === DEVICE_TYPES.LARGE_DESKTOP,
      orientation,
      hasTouch,
      isPortrait: orientation === 'portrait',
      isLandscape: orientation === 'landscape'
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const deviceType = getDeviceType(width);
      const orientation = getOrientation(width, height);
      const hasTouch = hasTouchSupport();

      setDevice({
        width,
        height,
        deviceType,
        isMobile: deviceType === DEVICE_TYPES.MOBILE,
        isTablet: deviceType === DEVICE_TYPES.TABLET,
        isLaptop: deviceType === DEVICE_TYPES.LAPTOP,
        isDesktop: deviceType === DEVICE_TYPES.DESKTOP,
        isLargeDesktop: deviceType === DEVICE_TYPES.LARGE_DESKTOP,
        orientation,
        hasTouch,
        isPortrait: orientation === 'portrait',
        isLandscape: orientation === 'landscape'
      });
    };

    // Debounce resize handler to improve performance
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return device;
};

// Hook for specific device type checks
export const useDeviceType = (targetType) => {
  const device = useDevice();
  return device.deviceType === targetType;
};

// Hook for breakpoint matching
export const useBreakpoint = (minWidth, maxWidth = null) => {
  const device = useDevice();
  
  if (maxWidth) {
    return device.width >= minWidth && device.width <= maxWidth;
  }
  
  return device.width >= minWidth;
};

// Utility function for CSS media queries
export const mediaQuery = (breakpoint) => {
  return `@media (max-width: ${BREAKPOINTS[breakpoint]}px)`;
};

// Utility function for min-width media queries
export const mediaQueryMin = (breakpoint) => {
  return `@media (min-width: ${BREAKPOINTS[breakpoint] + 1}px)`;
};

// Utility function for range media queries
export const mediaQueryRange = (minBreakpoint, maxBreakpoint) => {
  return `@media (min-width: ${BREAKPOINTS[minBreakpoint] + 1}px) and (max-width: ${BREAKPOINTS[maxBreakpoint]}px)`;
};

// CSS-in-JS helper for styled-components
export const deviceStyles = {
  mobile: `${mediaQuery('tablet')}`,
  tablet: `${mediaQueryRange('mobile', 'laptop')}`,
  laptop: `${mediaQueryRange('tablet', 'desktop')}`,
  desktop: `${mediaQueryRange('laptop', 'largeDesktop')}`,
  largeDesktop: `${mediaQueryMin('largeDesktop')}`
};

// Touch-friendly sizes for interactive elements
export const touchSizes = {
  minTouchTarget: '44px', // Minimum recommended touch target size
  preferredTouchTarget: '48px', // Preferred touch target size
  largeTouchTarget: '56px' // Large touch target for primary actions
};

export default useDevice;
