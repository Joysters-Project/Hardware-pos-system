// Re-export the canonical API instance so existing imports of '../api' still work.
// This file previously contained a standalone axios instance with a hardcoded URL.
export { default } from './api/axios';