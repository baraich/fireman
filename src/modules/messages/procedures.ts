import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";

export const messagesRouter = createTRPCRouter({
  getMany: baseProcedure
    .input(
      z.object({
        projectId: z.string().min(1, "Project ID is required!"),
      })
    )
    .query(async ({ input }) => {
      const messages = await prisma.message.findMany({
        orderBy: {
          updatedAt: "asc",
        },
        include: {
          fragment: true,
        },
        where: {
          projectId: input.projectId,
        },
      });

      return messages;
    }),
  create: baseProcedure
    .input(
      z.object({
        prompt: z
          .string()
          .min(1, "Prompt is required!")
          .max(10000, "Prompt too long!"),
        projectId: z.string().min(1, "Project ID is required!"),
      })
    )
    .mutation(async ({ input }) => {
      const newMessage = await prisma.message.create({
        data: {
          role: "USER",
          type: "RESULT",
          content: input.prompt,
          projectId: input.projectId,
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          prompt: input.prompt,
          projectId: input.projectId,
        },
      });

      return newMessage;
    }),
});
