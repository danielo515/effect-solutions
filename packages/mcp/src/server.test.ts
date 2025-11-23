import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { spawn } from "bun";

const SERVER_PATH = join(import.meta.dir, "server.ts");

// JSON-RPC response types
interface JsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number;
  result: T;
  error?: {
    code: number;
    message: string;
  };
}

// Create a class to manage stdio communication with the MCP server
class McpClient {
  private proc: ReturnType<typeof spawn>;
  private buffer = "";
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  constructor(serverPath: string, env?: Record<string, string>) {
    this.proc = spawn(["bun", serverPath], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, ...env },
    });

    // Read stdout continuously
    this.readOutput();
  }

  private async readOutput() {
    const decoder = new TextDecoder();
    const stdout = this.proc.stdout;
    if (!stdout || typeof stdout === "number") return;
    for await (const chunk of stdout) {
      this.buffer += decoder.decode(chunk);
      this.processBuffer();
    }
  }

  private processBuffer() {
    const lines = this.buffer.split("\n");
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.jsonrpc === "2.0" && "id" in parsed) {
          const pending = this.pendingRequests.get(parsed.id);
          if (pending) {
            this.pendingRequests.delete(parsed.id);
            pending.resolve(parsed);
          }
        }
      } catch {
        // Skip non-JSON lines (logs, etc)
      }
    }
  }

  async sendRequest(request: {
    jsonrpc: string;
    id: number;
    method: string;
    params?: unknown;
  }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout for ${request.method}`));
      }, 5000);

      this.pendingRequests.set(request.id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });

      const requestLine = `${JSON.stringify(request)}\n`;
      const stdin = this.proc.stdin;
      if (stdin && typeof stdin !== "number" && "write" in stdin) {
        stdin.write(requestLine);
      }
    });
  }

  sendNotification(notification: {
    jsonrpc: string;
    method: string;
    params?: unknown;
  }) {
    const notificationLine = `${JSON.stringify(notification)}\n`;
    const stdin = this.proc.stdin;
    if (stdin && typeof stdin !== "number" && "write" in stdin) {
      stdin.write(notificationLine);
    }
  }

  async close() {
    this.proc.kill();
    await this.proc.exited;
  }
}

describe("MCP Server Integration", () => {
  test("server initializes and responds to initialize request", async () => {
    const client = new McpClient(SERVER_PATH);

    try {
      const response = (await client.sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
      })) as JsonRpcResponse;

      expect(response.jsonrpc).toBe("2.0");
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      const result = response.result as Record<string, unknown>;
      expect(result.serverInfo).toBeDefined();
      expect((result.serverInfo as Record<string, unknown>).name).toBe(
        "effect-solutions",
      );
      expect(result.capabilities).toBeDefined();

      // Send initialized notification
      client.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });
    } finally {
      await client.close();
    }
  }, 10000);

  test("server lists tools", async () => {
    const client = new McpClient(SERVER_PATH);

    try {
      // Initialize first
      await client.sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      });

      client.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      // List tools
      const response = (await client.sendRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      })) as JsonRpcResponse;

      expect(response.result).toBeDefined();
      expect((response.result as Record<string, unknown>).tools).toBeDefined();
      expect(
        Array.isArray((response.result as Record<string, unknown>).tools),
      ).toBe(true);

      const toolNames = (
        (response.result as Record<string, unknown>).tools as Array<
          Record<string, unknown>
        >
      ).map((t) => t.name);
      expect(toolNames).toContain("search_effect_solutions");
      expect(toolNames).toContain("open_issue");
      expect(toolNames).toContain("get_help");
    } finally {
      await client.close();
    }
  }, 10000);

  test("server lists resources", async () => {
    const client = new McpClient(SERVER_PATH);

    try {
      // Initialize
      await client.sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      });

      client.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      // List resources
      const response = (await client.sendRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "resources/list",
        params: {},
      })) as JsonRpcResponse;

      expect(response.result).toBeDefined();
      expect(
        (response.result as Record<string, unknown>).resources,
      ).toBeDefined();
      expect(
        Array.isArray((response.result as Record<string, unknown>).resources),
      ).toBe(true);

      const uris = (
        (response.result as Record<string, unknown>).resources as Array<
          Record<string, unknown>
        >
      ).map((r) => r.uri);
      expect(uris).toContain("effect-docs://docs/topics");
      // Resource templates might be in a different field or not present in this version
    } finally {
      await client.close();
    }
  }, 10000);

  test("search tool returns results", async () => {
    const client = new McpClient(SERVER_PATH);

    try {
      // Initialize
      await client.sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      });

      client.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      // Call search tool
      const response = (await client.sendRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "search_effect_solutions",
          arguments: {
            query: "error handling",
          },
        },
      })) as JsonRpcResponse;

      expect(response.result).toBeDefined();
      expect(
        (response.result as Record<string, unknown>).content,
      ).toBeDefined();
      expect(
        Array.isArray((response.result as Record<string, unknown>).content),
      ).toBe(true);

      const content = (
        (response.result as Record<string, unknown>).content as Array<
          Record<string, unknown>
        >
      )[0];
      expect(content).toBeDefined();
      expect(content?.type).toBe("text");
      const results = JSON.parse((content?.text ?? "{}") as string) as Record<
        string,
        unknown
      >;
      expect(results.results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
      expect((results.results as Array<unknown>).length).toBeGreaterThan(0);

      // Should find error-handling doc
      const slugs = (results.results as Array<Record<string, unknown>>).map(
        (r) => r.slug,
      );
      expect(slugs).toContain("error-handling");
    } finally {
      await client.close();
    }
  }, 10000);

  test("open_issue tool returns issue url and message", async () => {
    const client = new McpClient(SERVER_PATH, {
      EFFECT_SOLUTIONS_OPEN_STRATEGY: "stub",
    });

    try {
      await client.sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      });

      client.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      const response = (await client.sendRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "open_issue",
          arguments: {
            category: "Fix",
            title: "Test title",
            description: "Body",
          },
        },
      })) as JsonRpcResponse;

      expect(response.result).toBeDefined();
      const result = response.result as Record<string, unknown>;
      const structuredContent = result.structuredContent as Record<
        string,
        unknown
      >;
      expect(structuredContent).toBeDefined();
      expect(structuredContent.issueUrl).toContain(
        "https://github.com/kitlangton/effect-solutions/issues/new",
      );
      expect(structuredContent.issueUrl).toContain("Test+title");
      expect(structuredContent.message).toContain("Opened GitHub issue");
      expect(structuredContent.opened).toBe(true);
      expect(structuredContent.openedWith).toBe("stub");

      const content = (result.content as Array<Record<string, unknown>>)[0];
      expect(content).toBeDefined();
      expect(content?.type).toBe("text");
      const parsed = JSON.parse((content?.text ?? "{}") as string) as Record<
        string,
        unknown
      >;
      expect(parsed.issueUrl).toBe(structuredContent.issueUrl);
      expect(parsed.openedWith).toBe("stub");
    } finally {
      await client.close();
    }
  }, 10000);

  test("get_help tool returns guide text", async () => {
    const client = new McpClient(SERVER_PATH, {
      EFFECT_SOLUTIONS_OPEN_STRATEGY: "stub",
    });

    try {
      await client.sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      });

      client.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      const response = (await client.sendRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "get_help",
          arguments: {},
        },
      })) as JsonRpcResponse;

      expect(response.result).toBeDefined();
      const result = response.result as Record<string, unknown>;
      const structuredContent = result.structuredContent as Record<
        string,
        unknown
      >;
      const content = result.content as Array<Record<string, unknown>>;
      expect(structuredContent).toBeDefined();
      expect(structuredContent.guide).toContain("MCP Server Guide");
      expect(structuredContent.guide).toContain("Available Tools");

      expect(content).toBeDefined();
      const firstContent = content[0];
      expect(firstContent).toBeDefined();
      const parsed = JSON.parse(
        (firstContent?.text ?? "{}") as string,
      ) as Record<string, unknown>;
      expect(parsed.guide).toBe(structuredContent.guide);
    } finally {
      await client.close();
    }
  }, 10000);

  test("resource read returns doc content", async () => {
    const client = new McpClient(SERVER_PATH);

    try {
      // Initialize
      await client.sendRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      });

      client.sendNotification({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });

      // Read topics index resource
      const response = (await client.sendRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "resources/read",
        params: {
          uri: "effect-docs://docs/topics",
        },
      })) as JsonRpcResponse;

      // Check if response has error or result
      if (response.error) {
        throw new Error(
          `Resource read failed: ${JSON.stringify(response.error)}`,
        );
      }

      expect(response.result).toBeDefined();
      const result = response.result as Record<string, unknown>;
      expect(result.contents).toBeDefined();
      expect(Array.isArray(result.contents)).toBe(true);

      const content = (result.contents as Array<Record<string, unknown>>)[0];
      expect(content).toBeDefined();
      expect(content?.uri).toBe("effect-docs://docs/topics");
      expect(content?.mimeType).toBe("text/markdown");
      expect(content?.text).toBeDefined();
      expect(content?.text).toContain("Effect Solutions Documentation Index");
      expect(content?.text).toContain("quick-start");
    } finally {
      await client.close();
    }
  }, 10000);
});
