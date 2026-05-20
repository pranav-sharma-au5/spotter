/** Local verification suite — not used in production Vercel builds. */
export const isVerificationEnabled =
  import.meta.env.VITE_ENABLE_VERIFICATION === 'true' || import.meta.env.DEV;
