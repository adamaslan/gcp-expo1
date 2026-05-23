# Raw Sources

This directory holds **immutable source documents** that the wiki synthesizes from. Per [[../SCHEMA#three-layers]], the LLM reads files here but never modifies them.

Drop user-curated sources into this directory: phase docs, session transcripts, incident reports, design notes. Then run `/wiki ingest <path>` to integrate them.

As of 2026-05-22 this directory is empty — the initial wiki was synthesized directly from the live files at `docs/` and `lib/` rather than from copied snapshots. When those files stabilize and you want a frozen evidence layer, copy them here.
