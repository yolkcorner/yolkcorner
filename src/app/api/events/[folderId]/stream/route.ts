import { NextRequest } from "next/server";
import { normalizeEventId } from "@/lib/download-r2";
import { getEventVersion, subscribeEventUpdates } from "@/lib/event-updates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

const toSseEvent = (payload: unknown) =>
  encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> },
) {
  const { folderId } = await params;
  const safeFolderId = normalizeEventId(folderId);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(toSseEvent(payload));
        } catch {
          closed = true;
        }
      };

      const unsubscribe = subscribeEventUpdates(safeFolderId, (version) => {
        send({ type: "update", version });
      });

      send({ type: "ready", version: getEventVersion(safeFolderId) });

      const heartbeat = setInterval(() => {
        send({ type: "heartbeat", ts: Date.now() });
      }, 25000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Stream might already be closed by client disconnect.
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
