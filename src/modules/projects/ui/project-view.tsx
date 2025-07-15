"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useTRPC } from "@/trpc/client";
import MessagesContainer from "./components/messages-container";
import { Suspense } from "react";

interface Props {
  projectId: string;
}

export const ProjectsView = ({ projectId }: Props) => {
  const trpc = useTRPC();

  // const { data: project } = useSuspenseQuery(
  //   trpc.projects.getOne.queryOptions({
  //     id: projectId,
  //   })
  // );

  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={25}
          className="flex flex-col min-h-0"
        >
          <Suspense fallback={<>Loading Messages...</>}>
            <MessagesContainer projectId={projectId} />
          </Suspense>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel
          defaultSize={65}
          minSize={50}
          className="flex flex-col min-h-0"
        >
          TODO: Preview
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
