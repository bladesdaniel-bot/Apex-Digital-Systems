// Owner/admin email address. It is read from an environment variable so the
// address is not stored in the source code that goes to GitHub.
// Set VITE_OWNER_EMAIL in your hosting environment and in a local .env file.
export const OWNER_EMAIL: string =
  (import.meta.env["VITE_OWNER_EMAIL"] as string | undefined) ||
  (typeof process !== "undefined" ? process.env["OWNER_EMAIL"] : undefined) ||
  "";
