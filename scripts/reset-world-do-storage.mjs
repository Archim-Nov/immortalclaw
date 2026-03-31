#!/usr/bin/env node

const workerBaseUrl = process.env.WORLD_DO_URL?.trim() || process.argv[2]?.trim();
const resetToken = process.env.WORLD_RESET_TOKEN?.trim() || process.argv[3]?.trim();

if (!workerBaseUrl) {
  throw new Error("Provide WORLD_DO_URL or pass the worker base URL as the first argument.");
}

if (!resetToken) {
  throw new Error("Provide WORLD_RESET_TOKEN or pass the reset token as the second argument.");
}

const resetUrl = new URL("/internal/reset-storage", workerBaseUrl);
const response = await fetch(resetUrl, {
  method: "POST",
  headers: {
    "x-world-reset-token": resetToken,
  },
});

const bodyText = await response.text();
if (!response.ok) {
  throw new Error(`Reset failed (${response.status}): ${bodyText}`);
}

console.log(bodyText);
