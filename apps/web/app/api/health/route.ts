import { readRuntimeBaseUrl } from "../../../lib/env";

export async function GET() {
  return Response.json({
    ok: true,
    runtimeBaseUrl: readRuntimeBaseUrl(),
  });
}
