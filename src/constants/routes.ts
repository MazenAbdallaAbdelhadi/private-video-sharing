/**
 * An Array of routes that are accessible to the public
 * These routes do not require authentication
 * @type {string[]}
 */
export const publicRoutes: string[] = ["/api/inngest"];

/**
 * An Array of routes that are used for authentication
 * These routes will redirect users to /settings
 * @type {string[]}
 */
export const authRoutes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/two-factor-authentication",
];

/**
 * The Prefix for API authentication routes
 * Routes that start with this prefix are used for API authentication purposes
 * @type {string}
 */
export const apiPrefix = "/api";

/**
 * The default redirect path after logging in
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
