import { readRuntimeBaseUrl } from "../lib/env.js";

export default function HomePage() {
  const runtimeBaseUrl = readRuntimeBaseUrl();

  return (
    <main>
      <h1>Immortal Claw</h1>
      <p>Deployment-ready web surface for the Vercel shell.</p>
      <p>Runtime endpoint: {runtimeBaseUrl ?? "not configured"}</p>
    </main>
  );
}
