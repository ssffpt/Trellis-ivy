/**
 * Common templates — single source of truth for all platforms.
 *
 * These templates contain {{placeholders}} that are resolved per-platform
 * by resolvePlaceholders() in configurators/shared.ts.
 *
 * Directory structure:
 *   common/
 *   ├── commands/        # Templates that stay as slash commands
 *   ├── skills/          # Single-file templates that become auto-triggered skills
 *   ├── bundled-skills/  # Multi-file built-in skills with references/assets
 *   └── agents/          # (deprecated) Old agent templates, now per-platform
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readTemplate(relativePath: string): string {
  return readFileSync(join(__dirname, relativePath), "utf-8");
}

function listMarkdownFiles(dir: string): string[] {
  try {
    return readdirSync(join(__dirname, dir))
      .filter((f) => f.endsWith(".md"))
      .sort();
  } catch {
    return [];
  }
}

export interface CommonTemplate {
  /** Template name without extension (e.g., "start", "before-dev") */
  name: string;
  /** Raw content with {{placeholders}} — must be resolved before writing */
  content: string;
}

export interface CommonBundledSkillFile {
  /** POSIX path relative to the skill directory, e.g. "references/core.md" */
  relativePath: string;
  /** Raw content with {{placeholders}} — must be resolved before writing */
  content: string;
}

export interface CommonBundledSkill {
  /** Skill directory name, e.g. "trellis-meta" */
  name: string;
  /** Files that must be written under the skill directory */
  files: CommonBundledSkillFile[];
}

// Cached results — files don't change during a CLI run
let cachedCommands: CommonTemplate[] | undefined;
let cachedSkills: CommonTemplate[] | undefined;
let cachedBundledSkills: CommonBundledSkill[] | undefined;

// Platform agent template cache (keyed by platform name)
const cachedPlatformAgents = new Map<string, CommonTemplate[]>();

/**
 * Get the path to a platform's templates directory.
 */
export function getPlatformTemplatePath(platform: string): string {
  const templatePath = join(__dirname, "..", platform);
  if (statSync(templatePath, { throwIfNoEntry: false })?.isDirectory()) {
    return templatePath;
  }
  throw new Error(
    `Could not find ${platform} templates directory. Expected at templates/${platform}/`,
  );
}

/**
 * List agent template files in a directory (md, toml, json).
 */
function listAgentFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter(
        (f) =>
          (f.endsWith(".md") || f.endsWith(".toml") || f.endsWith(".json")) &&
          !f.endsWith("-checklist.md") &&
          !f.endsWith("-checklist.toml") &&
          !f.endsWith("-checklist.json"),
      )
      .sort();
  } catch {
    return [];
  }
}

/**
 * List all files in a directory.
 */
function listAllFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".md") || f.endsWith(".toml") || f.endsWith(".json"))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Get agent templates from a specific platform directory.
 * These templates already have platform-specific frontmatter.
 * Results are cached after first call.
 */
export function getPlatformAgentTemplates(platform: string): CommonTemplate[] {
  let cached = cachedPlatformAgents.get(platform);
  if (!cached) {
    const platformDir = getPlatformTemplatePath(platform);
    const agentsDir = join(platformDir, "agents");
    cached = listAgentFiles(agentsDir).map((file) => {
      const ext = file.endsWith(".toml")
        ? ".toml"
        : file.endsWith(".json")
          ? ".json"
          : ".md";
      return {
        name: file.replace(new RegExp(`\\${ext}$`), ""),
        content: readFileSync(join(agentsDir, file), "utf-8"),
      };
    });
    cachedPlatformAgents.set(platform, cached);
  }
  return cached;
}

/**
 * Get checklist content from common/agents/ directory.
 * Returns null if the checklist file is missing.
 */
export function getPlatformChecklist(
  platform: string,
  checklistName: string,
): string | null {
  try {
    // Checklist files are shared across platforms in common/agents/
    const commonAgentsDir = join(__dirname, "agents");
    const files = listAllFiles(commonAgentsDir);
    const checklistFile = files.find((f) => f.startsWith(checklistName));
    if (checklistFile) {
      return readFileSync(join(commonAgentsDir, checklistFile), "utf-8").trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get all command templates (stay as slash commands on all platforms).
 * Results are cached after first call.
 */
export function getCommandTemplates(): CommonTemplate[] {
  cachedCommands ??= listMarkdownFiles("commands").map((file) => ({
    name: file.replace(/\.md$/, ""),
    content: readTemplate(`commands/${file}`),
  }));
  return cachedCommands;
}

/**
 * Get all skill templates (become auto-triggered skills on supporting platforms).
 * Results are cached after first call.
 */
export function getSkillTemplates(): CommonTemplate[] {
  cachedSkills ??= listMarkdownFiles("skills").map((file) => ({
    name: file.replace(/\.md$/, ""),
    content: readTemplate(`skills/${file}`),
  }));
  return cachedSkills;
}

function listDirectories(dir: string): string[] {
  try {
    return readdirSync(join(__dirname, dir))
      .filter((entry) => statSync(join(__dirname, dir, entry)).isDirectory())
      .sort();
  } catch {
    return [];
  }
}

function toPosixRelativePath(root: string, filePath: string): string {
  return relative(root, filePath).split(sep).join("/");
}

function listBundledSkillFiles(skillDir: string): CommonBundledSkillFile[] {
  const root = join(__dirname, "bundled-skills", skillDir);
  const files: CommonBundledSkillFile[] = [];

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        files.push({
          relativePath: toPosixRelativePath(root, fullPath),
          content: readFileSync(fullPath, "utf-8"),
        });
      }
    }
  }

  walk(root);
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Get all multi-file built-in skills.
 *
 * These are copied as complete skill directories so references and assets stay
 * lazy-loadable instead of being flattened into one oversized SKILL.md.
 */
export function getBundledSkillTemplates(): CommonBundledSkill[] {
  cachedBundledSkills ??= listDirectories("bundled-skills").map((name) => ({
    name,
    files: listBundledSkillFiles(name),
  }));
  return cachedBundledSkills;
}
