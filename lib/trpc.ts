// @ts-ignore
import { createTRPCReact } from "@trpc/react-query";
// @ts-ignore
import { httpBatchLink } from "@trpc/client";
// @ts-ignore
import superjson from "superjson";
// Server deps not installed in mobile project — use any as fallback type
type AppRouter = any;
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url: any, options: any) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
