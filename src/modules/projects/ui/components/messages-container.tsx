import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import MessageCard from "./message-card";
import MessageForm from "./message-form";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { Fragment } from "@/generated/prisma";
import MessageLoading from "./message-loading";

interface Props {
  projectId: string;
  activeFragment: Fragment | null;
  setActiveFragment: Dispatch<SetStateAction<Fragment | null>>;
}

export default function MessagesContainer({
  projectId,
  activeFragment,
  setActiveFragment,
}: Props) {
  const trpc = useTRPC();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageIdRef = useRef<string | null>(null);

  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions(
      { projectId },
      {
        refetchInterval: 5000,
      }
    )
  );

  useEffect(
    function () {
      const lastAssistantMessage = messages.findLast(
        (message) => message.role === "ASSISTANT"
      );

      if (
        lastAssistantMessage?.fragment &&
        lastAssistantMessage.id !== lastAssistantMessageIdRef.current
      ) {
        setActiveFragment(lastAssistantMessage.fragment);
        lastAssistantMessageIdRef.current = lastAssistantMessage.id;
      }
    },
    [messages]
  );

  useEffect(
    function () {
      bottomRef.current?.scrollIntoView();
    },
    [messages.length]
  );

  const lastMessageBelongsToUser =
    messages[messages.length - 1]?.role === "USER";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="pt-2 pr-1">
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              content={message.content}
              createdAt={message.createdAt}
              fragment={message.fragment}
              isActiveFragment={
                activeFragment?.id === message.fragment?.id
              }
              onFragmentClick={(fragment) =>
                setActiveFragment(fragment)
              }
              role={message.role}
              type={message.type}
            />
          ))}
          {lastMessageBelongsToUser && <MessageLoading />}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="relative p-3 pt-1">
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background/70 pointer-events-none" />
        <MessageForm projectId={projectId} />
      </div>
    </div>
  );
}
