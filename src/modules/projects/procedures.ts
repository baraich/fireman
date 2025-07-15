import { z } from "zod";
import { generateSlug } from "random-word-slugs";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { TRPCError } from "@trpc/server";

export const projectsRouter = createTRPCRouter({
  getOne: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.id,
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
  create: baseProcedure
    .input(
      z.object({
        prompt: z
          .string()
          .min(1, "Prompt is required!")
          .max(10000, "Prompt too long!"),
      })
    )
    .mutation(async ({ input }) => {
      const projectDetails = await prisma.project.create({
        data: {
          name: generateSlug(2, {
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
