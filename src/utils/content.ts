import type { FastifyReply } from "fastify";

export function setContentTypeAndFormat(
  fileName: string,
  content: Uint8Array,
  reply: FastifyReply
) {
  if (fileName.endsWith(".json")) {
    reply.header("Content-Type", "application/json");
    try {
      const text = new TextDecoder().decode(content);
      return JSON.parse(text);
    } catch {
      // If JSON parsing fails, return as binary
      reply.header("Content-Type", "application/octet-stream");
      return content;
    }
  } else if (fileName.endsWith(".js")) {
    reply.header("Content-Type", "text/javascript");
    return new TextDecoder().decode(content);
  } else if (fileName.endsWith(".png")) {
    reply.header("Content-Type", "image/png");
    return content;
  } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    reply.header("Content-Type", "image/jpeg");
    return content;
  } else {
    // Try to decode as text, fallback to binary
    try {
      const text = new TextDecoder().decode(content);
      reply.header("Content-Type", "text/plain");
      return text;
    } catch {
      reply.header("Content-Type", "application/octet-stream");
      return content;
    }
  }
}
