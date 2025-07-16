import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";
import { consumeCredits } from "@/lib/usage";

export const messagesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, "Project ID is required!"),
      })
    )
    .query(async ({ input, ctx }) => {
      const messages = await prisma.message.findMany({
        orderBy: {
          updatedAt: "asc",
        },
        include: {
          fragment: true,
        },
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.auth.userId,
          },
        },
      });

      return messages;
    }),
  create: protectedProcedure
    .input(
      z.object({
        prompt: z
          .string()
          .min(1, "Prompt is required!")
          .max(10000, "Prompt too long!"),
        projectId: z.string().min(1, "Project ID is required!"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Project not found!",
        });
      }

      try {
        await consumeCredits();
      } catch (error) {
        if (error instanceof Error) {
          console.log(error.message);
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: process.env.NODE_ENV,
          });
        } else {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "You have run out of credits",
          });
        }
      }
      const newMessage = await prisma.message.create({
        data: {
          role: "USER",
          type: "RESULT",
          content: input.prompt,
          projectId: existingProject.id,
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
