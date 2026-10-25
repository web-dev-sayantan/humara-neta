/** oRPC errors cross the wire as ORPCError shapes, so read the code defensively. */
function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export function isUnauthorized(error: unknown): boolean {
  return hasErrorCode(error, "UNAUTHORIZED");
}

/** A procedure asked for a row that does not exist — a 404, not a broke load. */
export function isNotFound(error: unknown): boolean {
  return hasErrorCode(error, "NOT_FOUND");
}
