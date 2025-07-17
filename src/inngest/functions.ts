import { Sandbox } from "@e2b/code-interpreter";
import { inngest } from "./client";
import {
  getSandbox,
  lastAssistantTextMessageContent,
  toolMessages,
} from "./utils";
import {
  createAgent,
  openai,
  createTool,
  createNetwork,
  createState,
  Message,
} from "@inngest/agent-kit";
import { z } from "zod";
import {
  FRAGMENT_TITLE_PROMPT,
  PROMPT,
  RESPONSE_PROMPT,
} from "@/prompt";
import { prisma } from "@/lib/db";
import { SANDBOX_DURATION } from "@/constants";

interface AgentState {
  vibed: string;
  files: { [path: string]: string };
}

const parseValue = (value: Message[], fallback: string) => {
  const output = value[0];
  if (output.type !== "text") {
    return fallback;
  }

  return (
    (Array.isArray(output.content)
      ? output.content.join("")
      : output.content) || fallback
  );
};

export const codeAgentFunction = inngest.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ step, event }) => {
    const oldSandboxId = await step.run(
      "get-sandbox-id",
      async () => {
        const project = await prisma.project.findUnique({
          where: {
            id: event.data.projectId,
          },
        });
        if (!project?.sandboxId) {
          const sandbox = await Sandbox.create("b-vibe-next");
          sandbox.setTimeout(SANDBOX_DURATION);
          const updatedProject = await prisma.project.update({
            data: {
              sandboxId: sandbox.sandboxId,
            },
            where: {
              id: event.data.projectId,
            },
          });
          return updatedProject.sandboxId as string;
        }

        return project.sandboxId;
      }
    );

    const sandboxId = await step.run("validate-sandbox", async () => {
      try {
        const sandbox = await getSandbox(oldSandboxId);
        return sandbox.sandboxId;
      } catch {
        // Sandbox has expired.
        const messages = await prisma.message.findMany({
          where: {
            project: {
              id: event.data.projectId,
            },
          },
          include: {
            fragment: true,
          },
        });

        const assistantMessagesWithValidFragments = messages.filter(
          (message) =>
            message.role === "ASSISTANT" && !!message.fragment
        );

        const newSandbox = await Sandbox.create("b-vibe-next");
        newSandbox.setTimeout(SANDBOX_DURATION);

        await prisma.project.update({
          data: {
            sandboxId: newSandbox.sandboxId,
          },
          where: {
            id: event.data.projectId,
            sandboxId: oldSandboxId,
          },
        });

        assistantMessagesWithValidFragments.forEach((message) => {
          const files = message.fragment?.files as
            | { [path: string]: string }
            | undefined;
          if (!files) return;

          Object.entries(files).forEach(([key, value]) => {
            newSandbox.files.write(key, value);
          });
        });

        return newSandbox.sandboxId;
      }
    });

    const previousMessages = await step.run(
      "get-previous-messages",
      async () => {
        const formattedMessages: Message[] = [];
        const messages = await prisma.message.findMany({
          where: {
            projectId: event.data.projectId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        });

        for (const message of messages) {
          formattedMessages.push({
            type: "text",
            role: message.role === "ASSISTANT" ? "assistant" : "user",
            content: message.content,
          });
        }

        return formattedMessages.reverse();
      }
    );

    const networkState = createState<AgentState>(
      {
        vibed: "",
        files: {},
      },
      {
        messages: previousMessages,
      }
    );

    const codeAgent = createAgent<AgentState>({
      name: "code-agent",
      description:
        "An advanced coding assistant that executes terminal commands, manages project files, and provides precise code-related solutions in a sandboxed environment.",
      system: PROMPT,
      model: openai({
        model: "gpt-4.1",
        defaultParameters: {
          temperature: 0.1,
        },
      }),
      tools: [
        createTool({
          name: "executeTerminalCommand",
          description:
            "Executes a specific command in a sandboxed terminal environment and returns the output.",
          parameters: z.object({
            command: z
              .string()
              .describe(
                "The terminal command to execute (e.g. 'npm install', 'ls -la')."
              ),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run(
              "executeTerminalCommand",
              async () => {
                const buffers = { stdout: "", stderr: "" };
                try {
                  const sandbox = await getSandbox(sandboxId);
                  const result = await sandbox.commands.run(command, {
                    onStdout: (data: string) => {
                      buffers.stdout += data;
                    },
                    onStderr: (data: string) => {
                      buffers.stderr += data;
                    },
                  });
                  return result.stdout || buffers.stdout;
                } catch (err) {
                  const errorMessage = `Command Failed: ${err}\n\nstdout: ${buffers.stdout}\n\nstderr: ${buffers.stderr}`;
                  console.error(errorMessage);
                  return errorMessage;
                }
              }
            );
          },
        }),
        createTool({
          name: "manageFiles",
          description:
            "Creates or updates files in the project directory within a sandboxed environment.",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z
                  .string()
                  .describe(
                    "The relative file path (e.g., 'src/index.js')."
                  ),
                content: z
                  .string()
                  .describe("The content to write to the file."),
              })
            ),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("manageFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                }
                return `Successfully Updated ${
                  Object.keys(files).length
                } file(s).`;
              } catch (err) {
                const errorMessage = `File operation failed: ${err}`;
                console.error(errorMessage);
                return errorMessage;
              }
            });
          },
        }),
        createTool({
          name: "readFiles",
          description:
            "Reads the contents of specified files from the project directory in a sandboxed environment.",
          parameters: z.object({
            files: z.array(
              z
                .string()
                .describe(
                  "The relative file path to read (e.g., 'src/index.js')."
                )
            ),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents = [];
                for (const file of files) {
                  const content = await sandbox.files.read(file);
                  contents.push({ path: file, content });
                }
                return JSON.stringify(contents, null, 2);
              } catch (err) {
                const errorMessage = `Error reading files: ${err}`;
                console.error(errorMessage);
                return errorMessage;
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantMessageText =
            lastAssistantTextMessageContent(result);

          if (lastAssistantMessageText && network) {
            if (lastAssistantMessageText.includes("<vibed>")) {
              const files = toolMessages(
                network.state.results
              ).flatMap((call) =>
                call.tools
                  .filter((tool) => tool.name === "manageFiles")
                  .flatMap((tool) =>
                    (
                      tool.input.files as {
                        path: string;
                        content: string;
                      }[]
                    ).reduce(
                      (acc, next) => ({
                        ...acc,
                        [next.path as string]: next.content as string,
                      }),
                      {}
                    )
                  )
              );

              network.state.data.files = files.reduce(
                (acc, next) => ({
                  ...acc,
                  ...next,
                }),
                {}
              );
              network.state.data.vibed = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork<AgentState>({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      defaultState: networkState,
      router: async ({ network }) => {
        return network.state.data.vibed ? undefined : codeAgent;
      },
    });

    const result = await network.run(event.data.prompt, {
      state: networkState,
    });

    const fragmentTitleGenerator = createAgent({
      name: "fragment-title-generator",
      description: "Fragment Title Generator",
      system: FRAGMENT_TITLE_PROMPT,
      model: openai({
        model: "gpt-4.1-nano",
      }),
    });

    const responseGenerator = createAgent({
      name: "response-generator",
      description: "Fragment Title Generator",
      system: RESPONSE_PROMPT,
      model: openai({
        model: "gpt-4.1-nano",
      }),
    });

    const { output: fragmentTitle } =
      await fragmentTitleGenerator.run(result.state.data.vibed);
    const { output: response } = await responseGenerator.run(
      result.state.data.vibed
    );

    const isError =
      !result.state.data.vibed ||
      Object.keys(result.state.data.files || {}).length === 0;

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    await step.run("saving", async () => {
      if (isError) {
        return await prisma.message.create({
          data: {
            type: "ERROR",
            role: "ASSISTANT",
            projectId: event.data.projectId,
            content: "Something went wrong. Please try again!",
          },
        });
      }
      return await prisma.message.create({
        data: {
          type: "RESULT",
          role: "ASSISTANT",
          projectId: event.data.projectId,
          content: parseValue(response, "Here you go!"),
          fragment: {
            create: {
              title: parseValue(fragmentTitle, "Fragment"),
              files: result.state.data.files || {},
              sandboxUrl: sandboxUrl,
            },
          },
        },
      });
    });

    return {
      url: sandboxUrl,
    };
  }
);
