import { projectsRouter } from "@/modules/projects/procedures";
import { createTRPCRouter } from "../init";
import { messagesRouter } from "@/modules/messages/procedures";
import { usageRouter } from "@/modules/usage/procedure";

export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  messages: messagesRouter,
  usage: usageRouter,
});

export type AppRouter = typeof appRouter;
