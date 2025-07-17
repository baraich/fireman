import { Button } from "@/components/ui/button";
import { SANDBOX_DURATION } from "@/constants";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { add, formatDuration, intervalToDuration } from "date-fns";
import { CrownIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Props {
  projectId: string;
  points: number;
  msBeforeNext: number;
}

export default function Usage({
  msBeforeNext,
  projectId,
  points,
}: Props) {
  const trpc = useTRPC();
  const { has } = useAuth();
  const hasProAccess = has?.({ plan: "pro" });
  const [sandboxValidTime, setSandboxValidTime] = useState("");

  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions({ projectId })
  );
  const targetDate = add(
    messages.findLast((message) => message.role === "USER")!
      .createdAt || new Date(),
    { seconds: SANDBOX_DURATION / 1000 }
  );
  console.log(targetDate);

  useEffect(
    function () {
      const updateCountdown = () => {
        const now = new Date();
        const remainingTime = targetDate.getTime() - now.getTime();

        if (remainingTime <= 0) {
          setSandboxValidTime("00:00");
          return;
        }

        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);

        // Format as "mm:ss" (e.g., "09:58")
        setSandboxValidTime(
          `${String(minutes).padStart(2, "0")}:${String(
            seconds
          ).padStart(2, "0")}`
        );
      };

      const interval = setInterval(updateCountdown, 1000);
      updateCountdown();

      return () => clearInterval(interval);
    },
    [messages, targetDate]
  );

  return (
    <div className="rounded-t-xl group bg-background border border-b-0 p-2 5">
      <div
        className={cn("flex items-center gap-x-2 justify-between")}
      >
        <div>
          <p className="text-sm">
            {points}
            {hasProAccess ? " " : " free "}credits remaining
          </p>
          <p className="text-xs text-muted-foreground">
            Resets in&nbsp;
            {formatDuration(
              intervalToDuration({
                start: new Date(),
                end: new Date(Date.now() + msBeforeNext),
              }),
              { format: ["months", "days", "hours"] }
            )}
          </p>
        </div>

        <div
          className={cn(
            "flex flex-col items-end justify-center",
            !hasProAccess && "group-hover:hidden"
          )}
        >
          <span className="text-sm">{sandboxValidTime}</span>
          <span className="text-xs text-muted-foreground">
            minutes remaining
          </span>
        </div>
        {!hasProAccess && (
          <Button
            asChild
            size={"sm"}
            variant={"tertiary"}
            className="ml-auto hidden group-hover:flex"
          >
            <Link href={"/pricing"} className="flex">
              <CrownIcon />
              <span>Upgrade</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
