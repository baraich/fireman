import { projectsRouter } from "@/modules/projects/procedures";
import { createTRPCRouter } from "../init";
import { messagesRouter } from "@/modules/messages/procedures";

export const appRouter = createTRPCRouter({
  projects: projectsRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;
