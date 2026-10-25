/** oRPC errors cross the wire as ORPCError shapes, so read the code defensively. */
export function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "UNAUTHORIZED"
  );
}
