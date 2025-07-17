"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import MessagesContainer from "./components/messages-container";
import { Suspense, useCallback, useState } from "react";
import { Fragment } from "@/generated/prisma";
import ProjectHeader from "./components/project-header";
import FragmentWeb from "./components/fragment-web";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CodeIcon, CrownIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import FileExplorer from "@/components/file-explorer";
import UserControl from "@/components/user-control";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { getSandboxRemainingTime } from "@/lib/sandbox";

interface Props {
  projectId: string;
}

export const ProjectsView = ({ projectId }: Props) => {
  const trpc = useTRPC();
  const { has } = useAuth();
  const isFreeUser = has?.({ plan: "free_user" });
  const [activeFragment, setActiveFragment] =
    useState<Fragment | null>(null);
  const [tabState, setTabState] = useState<"preview" | "code">(
    "preview"
  );

  const { data: messages } = useSuspenseQuery(
    trpc.messages.getMany.queryOptions({ projectId })
  );

  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          defaultSize={35}
          minSize={25}
          className="flex flex-col min-h-0"
        >
          <Suspense fallback={<p>Loading project...</p>}>
            <ProjectHeader projectId={projectId} />
          </Suspense>
          <Suspense fallback={<>Loading Messages...</>}>
            <MessagesContainer
              activeFragment={activeFragment}
              setActiveFragment={setActiveFragment}
              projectId={projectId}
            />
          </Suspense>
        </ResizablePanel>
        <ResizableHandle className="hover:bg-primary transition-colors" />
        <ResizablePanel defaultSize={65} minSize={50}>
          <Tabs
            className="h-full gap-y-0"
            defaultValue="preview"
            value={tabState}
            onValueChange={(value) =>
              setTabState(value as "code" | "preview")
            }
          >
            <div className="w-full flex items-center p-2 border-b gap-x-2">
              <TabsList className="h-8 p-0 border rounded-md">
                <TabsTrigger value="preview" className="rounded-md">
                  <EyeIcon />
                  <span>Demo</span>
                </TabsTrigger>
                <TabsTrigger value="code" className="rounded-md">
                  <CodeIcon />
                  <span>Code</span>
                </TabsTrigger>
              </TabsList>

              <div className="ml-auto flex items-center gap-x-2">
                {isFreeUser && (
                  <Button asChild size={"sm"} variant={"tertiary"}>
                    <Link href={"/pricing"}>
                      <CrownIcon />
                      <span>Upgrade</span>
                    </Link>
                  </Button>
                )}
                <UserControl />
              </div>
            </div>

            <TabsContent value="preview">
              {!!activeFragment &&
                (getSandboxRemainingTime(messages) <= 0 ? (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <div className="p-10 rounded-lg border bg-background text-center space-y-4 max-w-md mx-auto">
                      <h3 className="text-2xl font-bold">
                        Sandbox Expired
                      </h3>
                      <p className="text-muted-foreground">
                        The demo for this fragment has expired. You
                        can view the code in the code tab.
                      </p>
                      <Button
                        variant={"default"}
                        onClick={() => setTabState("code")}
                      >
                        <CodeIcon className="mr-2" />
                        View Code
                      </Button>
                    </div>
                  </div>
                ) : (
                  <FragmentWeb data={activeFragment} />
                ))}
            </TabsContent>
            <TabsContent value="code" className="min-h-0">
              {!!activeFragment?.files && (
                <FileExplorer
                  files={
                    activeFragment.files as { [path: string]: string }
                  }
                />
              )}
            </TabsContent>
          </Tabs>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
