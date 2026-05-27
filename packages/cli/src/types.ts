export type ArtifactType =
  | "acceptance-criteria"
  | "ui-state-matrix"
  | "sprint-backlog"
  | "observability";

export const ALL_ARTIFACTS: ArtifactType[] = [
  "acceptance-criteria",
  "ui-state-matrix",
  "sprint-backlog",
  "observability",
];

export interface RequirementFrontmatter {
  id?: string;
  title?: string;
  version?: string;
  stakeholders?: string[];
}

export interface RequirementModel {
  path: string;
  frontmatter: RequirementFrontmatter;
  body: string;
  sections: Record<string, string>;
  raw: string;
}

export interface AlignxConfig {
  output_dir: string;
  requirement_path: string;
  artifacts?: ArtifactType[];
}

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AppConfig {
  /** Base output directory (e.g. ./output) */
  outputDir: string;
  /** Timestamped run directory (e.g. ./output/20260526_111111) */
  runOutputDir?: string;
  requirementPath: string;
  llm: LlmConfig;
  artifacts: ArtifactType[];
}

export interface ArtifactManifestEntry {
  path: string;
  sha256: string;
  source_sha256: string;
  generator: string;
  generated_at: string;
}

export interface AlignxManifest {
  run_id?: string;
  requirement: {
    path: string;
    sha256: string;
    parsed_version?: string;
  };
  artifacts: Partial<Record<ArtifactType, ArtifactManifestEntry>>;
}

export interface DriftIssue {
  artifact: ArtifactType | "requirement";
  message: string;
}
