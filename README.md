# MDS

This repository contains Kirk Sweeney's data engineering and software blog.
The site is now built with Astro while the original Hugo sources remain in `hugo/` for archival reference.

## Development environment

Install Nix with flakes enabled.
The development shell provides Node.js, GNU Make, and Git on macOS and Linux:

```sh
nix develop
```

For automatic activation, install direnv with nix-direnv integration and enable the direnv hook in your shell.
Then approve the repository's `.envrc` once:

```sh
direnv allow
```

Without entering a shell, prefix commands with `nix develop --command`.

## Preview locally

Install JavaScript dependencies and start Astro:

```sh
npm ci
make serve
```

Open <http://localhost:4321/>.
Draft posts are included during development.
Production builds exclude drafts from routes, search, tags, feeds, and the sitemap.

## Build and validate

Build the static site with:

```sh
make build
```

The hosting output is `docs/`.
To avoid changing tracked hosting output while validating, override Astro's output directory:

```sh
npm run build -- --outDir /tmp/mds-astro-preview
```

Run checks with `make check`.
Validate a production build without touching `docs/` with `npm run build -- --outDir /tmp/mds-astro-preview && npm run validate:build -- /tmp/mds-astro-preview`.

## Content

Astro reads migrated post sources from `src/content/posts/`.
The Hugo content and theme remain under `hugo/` and are not required for an Astro build.
Post image URLs retain the existing `/posts/<slug>/images/...` paths.
Create a new Markdown post in `src/content/posts/` with frontmatter matching the existing posts.

The `agentic-sdlc` static page and `CNAME` are retained in `public/`.

## Systems Journal design

The site uses self-hosted Space Grotesk, DM Sans, and IBM Plex Mono fonts with a sage and deep-green palette.
About and Projects use existing repository information.
Articles include reading time, a table of contents, dual-theme syntax highlighting, and copy-code buttons.
Comments load only when the reader opens the Disqus control.

Markdown and MDX posts are supported in `src/content/posts/`.
MDX is trusted repository code and can import components; do not use untrusted submissions without review.
Put optimized article images beside each post in its `images/` directory.
Keep existing public image copies when preserving legacy URLs; tests check the migrated copies for equality.
`npm test` temporarily creates an MDX fixture and removes it afterward; do not run simultaneous test builds in the same checkout.
