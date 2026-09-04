export function getApplicationVersion() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  return sha ? sha.slice(0, 7) : "Local";
}
