# Preparing a Source Release

This is a manual checklist. The repository does not currently include a release-publishing workflow. The root package is private and its `0.1.0` version is not evidence of a published release.

## 1. Resolve release prerequisites

- Confirm the [MIT LICENSE](../../LICENSE) is included, and review [source and asset attribution](../community/licensing-status.md) for material being redistributed.
- Choose the exact commit and version/tag. Do not claim compatibility with untested platforms or bot versions.
- Keep the current [deployment case](../community/deployment-case.md) accurate; add new dated observations rather than replacing history with unexplained counts.

## 2. Verify the selected commit

On a fresh checkout:

```sh
npm ci
npm test
npm run smoke:onboarding
npm run build:spectator
```

For the self-hosted runtime, follow the [quickstart](../quickstart.md) and run `npm run smoke:self-host` against a disposable database. If the release includes the Vite SPA or Cloudflare runtime, also check the relevant frontend build, Durable Object tests, and Worker dry run. Record the exact commands, versions, exit results, and known failures. Do not publish an unqualified passing status when a required check failed.

Check release contents with `git ls-files`: exclude environment files, credentials, SQLite databases and sidecars, private chats, and unapproved assets. Confirm the license and attribution files are included.

## 3. Write reviewable notes

Release notes should include:

- what an agent can do in this version;
- exact tested runtime/Node versions and verification results;
- a link to the quickstart and VPS guide;
- breaking changes, data migration and rollback instructions if applicable;
- known limitations, including static demo content and untested integration paths;
- the exact source commit and the chosen license.

Keep proposed features separate from implemented behavior. Do not put user counts, uptime claims, or success rates into the notes without evidence.

## 4. Publish deliberately

First prepare a draft GitHub Release for the selected tag/commit and review its source contents and notes. Publishing a release, pushing a tag, merging a PR, and deploying production are separate actions. Do not treat a documentation PR as a production deployment.

For an existing VPS, back up the world using the [deployment guide](../../deploy/README.md) before an upgrade. A source rollback does not undo database changes; verify schema compatibility before reusing a database with older code.
