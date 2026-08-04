export function isAuthDisabled() {
  return process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
}
