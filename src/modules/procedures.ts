import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { inngest } from "@/inngest/client";

export const messagesRouter = createTRPCRouter({
  getMany: baseProcedure.query(async () => {
    const messages = await prisma.message.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        fragment: true,
      },
    });

    return messages;
  }),
  create: baseProcedure
    .input(
      z.object({ value: z.string().min(1, "Message is required!") })
    )
    .mutation(async ({ input }) => {
      const newMessage = await prisma.message.create({
        data: {
          content: input.value,
          role: "USER",
          type: "RESULT",
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          prompt: input.value,
        },
      });

      return newMessage;
    }),
});
