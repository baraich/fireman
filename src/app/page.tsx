"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export default function HomePage() {
  const trpc = useTRPC();
  const [value, setValue] = useState<string>("");

  const { data: messages } = useQuery(
    trpc.messages.getMany.queryOptions()
  );
  const createMessage = useMutation(
    trpc.messages.create.mutationOptions({
      onSuccess: () => {
        toast.success("Message Created!");
      },
    })
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        disabled={createMessage.isPending}
        onClick={() => createMessage.mutate({ value: value })}
      >
        Invoke Background Job
      </Button>
      <pre>{JSON.stringify(messages, null, 2)}</pre>
    </div>
  );
}
