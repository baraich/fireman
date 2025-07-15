import "server-only";
import { cache } from "react";
import { makeQueryClient } from "./query-client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { createTRPCContext } from "./init";
import { appRouter } from "./routers/_app";

export const getQueryClient = cache(makeQueryClient);
export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: createTRPCContext,
  queryClient: getQueryClient,
});

export const caller = appRouter.createCaller(createTRPCContext);
