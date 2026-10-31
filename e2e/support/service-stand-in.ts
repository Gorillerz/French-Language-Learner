import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export type RecordedRequest = {
  method: string;
  path: string;
  headers: IncomingMessage["headers"];
  /** Parsed JSON when the body is JSON, otherwise the raw text. */
  body: unknown;
};

export type Reply = { status?: number; json?: unknown; headers?: Record<string, string> };
export type Responder = Reply | ((request: RecordedRequest) => Reply);

/**
 * A real HTTP service standing in for the cloud or AI host. It runs in the test
 * process, so a test scripts it and inspects what it received directly. Because
 * traffic crosses the network, CORS and `context.setOffline` behave as in
 * production. Requests a test has not scripted get a 501.
 */
export class ServiceStandIn {
  /** Everything the service received, oldest first. CORS preflights are left out. */
  readonly requests: RecordedRequest[] = [];
  readonly url: string;

  private readonly responders = new Map<string, Responder>();
  private readonly server: Server;
  private isDown = false;

  constructor(private readonly port: number) {
    this.url = `http://127.0.0.1:${port}`;
    this.server = createServer((request, response) => {
      void this.handle(request, response);
    });
  }

  /**
   * Scripts the reply to a route, replacing any earlier script for it. A path
   * without a query also answers calls to that path with one.
   */
  respond(method: string, path: string, responder: Responder) {
    this.responders.set(`${method} ${path}`, responder);
  }

  /** Makes every call fail at the network level until `comeBack`. */
  goDown() {
    this.isDown = true;
    this.server.closeAllConnections();
  }

  comeBack() {
    this.isDown = false;
  }

  start() {
    return new Promise<void>((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(this.port, "127.0.0.1", resolve);
    });
  }

  stop() {
    this.server.closeAllConnections();
    return new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  private async handle(request: IncomingMessage, response: ServerResponse) {
    if (this.isDown) {
      request.socket.destroy();
      return;
    }

    response.setHeader("Access-Control-Allow-Origin", "*");
    if (request.method === "OPTIONS") {
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      response.setHeader(
        "Access-Control-Allow-Headers",
        request.headers["access-control-request-headers"] ?? "",
      );
      response.writeHead(204).end();
      return;
    }

    const recorded: RecordedRequest = {
      method: request.method ?? "",
      path: request.url ?? "",
      headers: request.headers,
      body: parseBody(await readText(request)),
    };
    this.requests.push(recorded);

    const responder =
      this.responders.get(`${recorded.method} ${recorded.path}`) ??
      this.responders.get(`${recorded.method} ${recorded.path.split("?")[0]}`);
    const reply =
      typeof responder === "function"
        ? responder(recorded)
        : (responder ?? {
            status: 501,
            json: { error: `Nothing scripted for ${recorded.method} ${recorded.path}` },
          });

    response
      .writeHead(reply.status ?? 200, { "Content-Type": "application/json", ...reply.headers })
      .end(JSON.stringify(reply.json ?? null));
  }
}

async function readText(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function parseBody(text: string): unknown {
  if (text === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
