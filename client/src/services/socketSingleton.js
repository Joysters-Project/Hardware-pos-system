/**
 * socketSingleton.js
 *
 * One socket for the entire app lifetime — created once at module evaluation,
 * never inside a React effect. Strict Mode double-invocation cannot touch it.
 *
 * Components subscribe/unsubscribe to named events through the helper API.
 */
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket", "polling"],
  autoConnect: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10,
});

/**
 * Subscribe to a socket event.
 * Returns an unsubscribe function — call it in your useEffect cleanup.
 *
 * Usage:
 *   useEffect(() => {
 *     return subscribeToEvent("alerts:updated", handleUpdate);
 *   }, []);
 */
export function subscribeToEvent(event, handler) {
  socket.on(event, handler);
  return () => socket.off(event, handler);
}

export default socket;
