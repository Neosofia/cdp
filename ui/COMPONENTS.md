# Component Strategy & UI Guidelines

This document outlines how to retrieve, add, update, and style UI components in the Clinical Data Platform (CDP) UI, ensuring pixel-perfect alignment with the Neosofia corporate brand.

## Shared UI Registry

We use a decentralized registry model based on [shadcn/ui](https://ui.shadcn.com/) rather than a monolithic NPM package. Our source of truth for component logic and structure lives in `templates/ui/registry/`. 

This approach gives the CDP UI full local ownership of the component code (in `src/components/ui`), while standardizing the baseline primitives.

### Getting a New Component

To add a new component to the CDP UI:

1. Use the `shadcn` CLI to pull the component from the corporate template registry (using the raw GitHub URL or local equivalent if configured):
   ```bash
   npx shadcn add "https://raw.githubusercontent.com/Neosofia/templates/main/ui/registry/ui/<component-name>.json"
   ```
2. The CLI will insert the component into `src/components/ui/`.
3. Check the component's internal dependencies (like `lucide-react` or `@radix-ui/react-*`) and ensure they are installed in `package.json`.

### Updating an Existing Component

If the corporate component source changes in `templates/ui`:

1. Re-run the `shadcn add` command with the `--overwrite` flag:
   ```bash
   npx shadcn add "https://raw.githubusercontent.com/Neosofia/templates/main/ui/registry/ui/<component-name>.json" --overwrite
   ```
2. Re-apply any CDP-specific dark theme or layout tweaks if they were overwritten (see Custom Styling below).

---

## Brand Styling & The Dark-Theme CSS Variable Rule

We use Tailwind CSS (v4) with explicit class definitions rather than relying on dynamic CSS variable toggling for the corporate look. 

The public corporate site (`neosofia.tech`) relies heavily on **brand navy (blue-gray)** values in its dark theme, not the default pure black/gray variants shadcn ships with.

### The Problem with Default Variables
The standard shadcn variables (e.g., `bg-background`, `bg-card`, `bg-popover`) often resolve incorrectly or fallback to pitch black `oklch(0.145 0 0)` in dark mode. 

### The Solution: Explicit Tailwind Classes
Whenever you add or update a component, or build a new layout, **replace the default CSS-variable classes with explicit Tailwind `slate` or `sky` classes** directly in the layout or the `src/components/ui/` file. Do not change the component's public React API (props).

**Corporate Color Mapping:**
*   **Canvas Background:** Use `bg-slate-900` instead of `bg-background`.
*   **Interactive Cards / Sub-panels:** Use `bg-slate-800/50` or `bg-slate-800` instead of `bg-card`.
*   **Sticky/Frosted Headers:** Use `bg-slate-900/90 backdrop-blur-lg border-white/10`.
*   **Primary Borders/Dividers:** Use `border-white/10` or `border-slate-800`.
*   **Text/Typo:** Use `text-slate-100` (primary) and `text-slate-400` (secondary/muted) instead of `text-foreground` and `text-muted-foreground`.

By keeping these explicit utility classes hardcoded in the component or layout tree, you guarantee a 1:1 match with the corporate design system and prevent Vite tailwind processor errors in the Docker compilation.
