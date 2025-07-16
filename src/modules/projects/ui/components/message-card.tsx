import {
  Fragment,
  MessageRole,
  MessageType,
} from "@/generated/prisma";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Image from "next/image";
import { ChevronRightIcon, Code2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JSX } from "react";

interface UserMessageProps {
  content: string;
}

const UserMessage = ({ content }: UserMessageProps) => {
  return (
    <div className="flex justify-end pb-4 pr-2 pl-10">
      <Card className="rounded-lg bg-muted p-3 shadown-none border-none max-w-[80%] break-words">
        {content}
      </Card>
    </div>
  );
};

interface FragmentCardProps {
  fragment: Fragment;
  isActiveFragment: boolean;
  onFragmentClick: (fragment: Fragment) => void;
}

const FragmentCard = ({
  fragment,
  isActiveFragment,
  onFragmentClick,
}: FragmentCardProps) => {
  return (
    <button
      className={cn(
        "flex items-start text-start gap-2 border rounded-lg bg-muted w-fit p-3 hover:bg-secondary transition-colors",
        isActiveFragment &&
          "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
      )}
      onClick={() => onFragmentClick(fragment)}
    >
      <Code2Icon className="size-4 mt-0.5" />
      <div className="flex flex-col flex-1">
        <span className="text-sm font-medium line-clamp-1">
          {fragment.title}
        </span>
        <span className="text-sm">Preview</span>
      </div>
      <div className="flex items-center justify-center mt-0.5">
        <ChevronRightIcon className="size-4" />
      </div>
    </button>
  );
};

interface AssistantMessage
  extends Omit<FragmentCardProps, "fragment"> {
  content: string;
  createdAt: Date;
  fragment: Fragment | null;
  type: MessageType;
}

export const AssistantMessage = ({
  content,
  createdAt,
  fragment,
  isActiveFragment,
  onFragmentClick,
  type,
}: AssistantMessage) => {
  const renderFileReference = (reference: string) => (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="font-bold mx-0 px-2 truncate"
    >
      <b>
        {reference.substring(0, 4)}
        ...
        {reference.substring(reference.length - 6)}
      </b>
    </Button>
  );

  const renderContent = () => {
    const filePathRegex =
      /(?:\([\w-]+(?:\/[\w-]+)*\.[\w-]+\)|[\w-]+(?:\/[\w-]+)*\.[\w-]+\b)/g;
    let lastIndex = 0;
    const elements: JSX.Element[] = [];

    let match;
    while ((match = filePathRegex.exec(content)) !== null) {
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      if (matchStart > lastIndex) {
        elements.push(
          <span key={lastIndex}>
            {content.slice(lastIndex, matchStart)}
          </span>
        );
      }

      elements.push(
        <span key={matchStart}>{renderFileReference(match[0])}</span>
      );

      lastIndex = matchEnd;
    }

    if (lastIndex < content.length) {
      elements.push(
        <span key={lastIndex}>{content.slice(lastIndex)}</span>
      );
    }

    return elements;
  };

  return (
    <div
      className={cn(
        "flex flex-col group px-2 pb-4",
        type === "ERROR" && "text-red-700 dark:text-rose-500"
      )}
    >
      <div className="flex items-center gap-2 pl-2 mb-2">
        <Image
          src={"/logo.svg"}
          alt="Vibe"
          width={18}
          height={18}
          className="shrink-0"
        />
        <span className="text-sm font-medium">Vibe</span>
        <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {format(createdAt, "HH:mm 'on' MMM dd, yyyy")}
        </span>
      </div>
      <div className="pl-8.5 flex flex-col gap-y-4">
        <span className="inline-block text-balance break-words">
          {renderContent()}
        </span>
        {fragment && type === "RESULT" && (
          <FragmentCard
            fragment={fragment}
            isActiveFragment={isActiveFragment}
            onFragmentClick={onFragmentClick}
          />
        )}
      </div>
    </div>
  );
};

interface Props extends AssistantMessage {
  role: MessageRole;
}

export default function MessageCard({
  content,
  createdAt,
  fragment,
  isActiveFragment,
  onFragmentClick,
  role,
  type,
}: Props) {
  return (
    <div>
      {role === "ASSISTANT" ? (
        <AssistantMessage
          content={content}
          createdAt={createdAt}
          fragment={fragment}
          isActiveFragment={isActiveFragment}
          onFragmentClick={onFragmentClick}
          type={type}
        />
      ) : (
        <UserMessage content={content} />
      )}
    </div>
  );
}
