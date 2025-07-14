import superjson from "superjson";
import { initTRPC } from "@trpc/server";
import { cache } from "react";

export const createTRPCContext = cache(async () => {
  return {};
});

const t = initTRPC.create({
  transformer: superjson,
});
export const createTRPCRouter = t.router;
export const createCallerFactroy = t.createCallerFactory;
export const baseProcedure = t.procedure;
