import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "@/services";

async function handle({ request }: { request: Request }) {
  return getAuth().handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
