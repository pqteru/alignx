import { readFile } from "node:fs/promises";
import matter from "gray-matter";
import type { RequirementFrontmatter, RequirementModel } from "../types.js";

function parseSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = body.split("\n");
  let currentKey: string | null = null;
  const buffer: string[] = [];

  const flush = () => {
    if (currentKey) {
      sections[currentKey] = buffer.join("\n").trim();
      buffer.length = 0;
    }
  };

  for (const line of lines) {
    const match = /^##\s+(.+)$/.exec(line);
    if (match) {
      flush();
      currentKey = match[1]!.trim().toLowerCase().replace(/\s+/g, "-");
      continue;
    }
    if (currentKey) buffer.push(line);
  }
  flush();
  return sections;
}

export async function parseRequirement(path: string): Promise<RequirementModel> {
  const raw = await readFile(path, "utf8");
  const { data, content } = matter(raw);
  const frontmatter = data as RequirementFrontmatter;

  return {
    path,
    frontmatter,
    body: content.trim(),
    sections: parseSections(content),
    raw,
  };
}

export function requirementSummary(model: RequirementModel): string {
  const fm = model.frontmatter;
  const header = [
    fm.id && `ID: ${fm.id}`,
    fm.title && `Title: ${fm.title}`,
    fm.version && `Version: ${fm.version}`,
    fm.stakeholders?.length && `Stakeholders: ${fm.stakeholders.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const sectionText = Object.entries(model.sections)
    .map(([k, v]) => `### ${k}\n${v}`)
    .join("\n\n");

  return [header, model.body, sectionText].filter(Boolean).join("\n\n---\n\n");
}
