import { readRuntimeBaseUrl } from "../../../lib/env.js";

export async function GET() {
  return Response.json({
    ok: true,
    runtimeBaseUrl: readRuntimeBaseUrl(),
  });
}
