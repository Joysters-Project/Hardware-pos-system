/**
 * Hook to prevent back button navigation
 * Useful after logout to prevent users from navigating back to protected pages.
 * This implementation avoids adding extra browser history entries.
 */
export const usePreventBackNavigation = () => {
  const preventBack = () => {
    const handlePopState = () => {
      window.history.forward();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  };

  return preventBack;
};

/**
 * Prevent browser back button from navigating to protected pages.
 * Call this immediately on logout.
 */
export const disableBackButton = () => {
  window.addEventListener("popstate", () => {
    window.history.forward();
  });
};
