import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found!",
        });
      }

      return existingProject;
    }),
  getMany: protectedProcedure.query(async ({ ctx }) => {
    const projects = await prisma.project.findMany({
      where: {
        userId: ctx.auth.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    return projects;
  }),
  create: protectedProcedure
    .input(
      z.object({
        prompt: z
          .string()
          .min(1, "Prompt is required!")
          .max(10000, "Prompt too long!"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectDetails = await prisma.project.create({
        data: {
          userId: ctx.auth.userId,
          name: generateSlug(Math.ceil(Math.random() * 4), {
            format: "kebab",
          }),
          messages: {
            create: {
              role: "USER",
              type: "RESULT",
              content: input.prompt,
            },
          },
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          prompt: input.prompt,
          projectId: projectDetails.id,
        },
      });

      return projectDetails;
    }),
});
