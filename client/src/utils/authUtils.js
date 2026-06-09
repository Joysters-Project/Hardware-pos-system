/**
 * Hook to prevent back button navigation
 * Useful after logout to prevent users from navigating back to protected pages
 */
export const usePreventBackNavigation = () => {
  const preventBack = () => {
    // Push a new history entry to make the current page the "top" of the stack
    window.history.pushState(null, null, window.location.href);
    
    // Handle back button clicks
    const handlePopState = () => {
      // When user tries to go back, push them forward again
      window.history.pushState(null, null, window.location.href);
    };
    
    window.addEventListener("popstate", handlePopState);
    
    // Return cleanup function
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  };

  return preventBack;
};

/**
 * Prevent browser back button from navigating to protected pages
 * Call this immediately on logout
 */
export const disableBackButton = () => {
  window.history.pushState(null, null, window.location.href);
  window.addEventListener("popstate", () => {
    window.history.pushState(null, null, window.location.href);
  });
};
