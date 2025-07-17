import { SANDBOX_DURATION } from "@/constants";
import { Message } from "@/generated/prisma";
import { add, sub } from "date-fns";

export const getSandboxRemainingTime = function (
  messages: Message[]
) {
  const lastMessage = messages[messages.length - 1];

  const lastUserMessage = messages.findLast((message) =>
    lastMessage.role === "USER"
      ? message.role === "USER" && message.id !== lastMessage.id
      : message.role === "USER"
  );

  const targetDate = sub(
    add(lastUserMessage?.createdAt || new Date(), {
      seconds: SANDBOX_DURATION / 1000,
    }),
    { minutes: 2 }
  );
  const now = new Date();

  return targetDate.getTime() - now.getTime();
};
