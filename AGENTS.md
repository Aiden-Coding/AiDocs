# Project Overview

Docusaurus 3.10 + React 19 + TypeScript tech documentation repository ([AiDocs](docusaurus.config.ts)).

## Development Commands

- Start dev server: `npm start`
- Build site: `npm run build`
- Type check: `npm run typecheck`
- Clear cache: `npm run clear`

## Project Guidelines & Pitfalls

- **Broken Links**: Docusaurus checks relative paths strictly. Do NOT reference uncreated markdown files in `[link](path.md)`. See [/memories/repo/changelog-guide.md](/memories/repo/changelog-guide.md) or [docs/changelog.md](docs/changelog.md).
- **MDX / Mermaid**: MDX parsing can conflict with JSX `{}` brackets or unescaped characters inside code blocks/Mermaid. Use skill `check-mermaid` for Mermaid diagrams.
- **Math**: KaTeX math syntax enabled via `remark-math` and `rehype-katex`. Wrap inline math in `$` and block math in `$$`.

## AI Working Rules

- **Communication Style**: Respond terse like smart caveman when configured, preserve all technical precision.
- **Link Formatting**: Follow workspace relative path markdown linking guidelines without backticks around links.

## Skills & Agents

- [Skills Directory](.agents/skills) contains custom domain skills (Java, Rust, React, Swift, MySQL, Mermaid, Markdown formatters, Git commit).
- [Repo Memory](/memories/repo/) holds persistent workspace conventions.
