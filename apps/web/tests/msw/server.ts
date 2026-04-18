import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Node (vitest + jsdom) MSW server. Started in tests/setup.ts; per-test
 * overrides use `server.use(...)`.
 */
export const server = setupServer(...handlers);
