import { Sandbox } from "@e2b/code-interpreter";
import { inngest } from "./client";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import {
  createAgent,
  openai,
  createTool,
  createNetwork,
} from "@inngest/agent-kit";
import { z } from "zod";
import { PROMPT } from "@/ai/prompt";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello-world" },
  async ({ step, event }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("b-vibe-next");
      return sandbox.sandboxId;
    });

    const codeAgent = createAgent({
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
            "Executes a specific command in a sandboxed terminal environment and returs the output.",
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
          handler: async ({ files }, { step, network }) => {
            return await step?.run("manageFiles", async () => {
              try {
                const updatedFiles = network.state.data.files || {};
                const sandbox = await getSandbox(sandboxId);
                for (const file of files) {
                  await sandbox.files.write(file.path, file.content);
                  updatedFiles[file.path] = file.content;
                }
                network.state.data.files = updatedFiles;
                return `Successfully updated ${files.length} file(s).`;
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
              network.state.data.vibed = lastAssistantMessageText;
            }
          }

          return result;
        },
      },
    });

    const network = createNetwork({
      name: "coding-agent-network",
      agents: [codeAgent],
      maxIter: 15,
      router: async ({ network }) => {
        return network.state.data.vibed ? undefined : codeAgent;
      },
    });

    const result = await network.run(event.data.prompt);

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(3000);
      return `https://${host}`;
    });

    return {
      url: sandboxUrl,
      title: "Fragment",
      files: result.state.data.files,
      vibed: result.state.data.vibed,
    };
  }
);
