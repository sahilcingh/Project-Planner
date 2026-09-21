import type { StackOptionSeed } from "./catalog";

export type StarterMilestone = {
  title: string;
  tasks: string[];
};

/**
 * Derives a starter milestone/task checklist directly from a stack
 * option's own `components` — no separate seeded template table to keep
 * in sync with the catalog. Deterministic and pure, same pattern as
 * scoring.ts.
 */
export function generateStarterPlan(
  option: StackOptionSeed,
): StarterMilestone[] {
  const { components } = option;
  const setupTasks: string[] = [];
  if (components.frontend) setupTasks.push(`Initialize ${components.frontend} project`);
  if (components.auth) setupTasks.push(`Configure ${components.auth}`);
  if (components.database) setupTasks.push(`Design ${components.database} schema`);
  if (setupTasks.length === 0) setupTasks.push("Initialize project repository");

  const buildTasks: string[] = ["Build core features"];
  if (components.backend) buildTasks.push(`Wire up ${components.backend} API routes`);

  return [
    { title: "Project setup", tasks: setupTasks },
    { title: "Core build", tasks: buildTasks },
    {
      title: "Testing & polish",
      tasks: ["Write tests for core flows", "Handle edge cases and error states"],
    },
    {
      title: "Deploy",
      tasks: [
        components.hosting ? `Deploy to ${components.hosting}` : "Deploy to production",
        "Set up basic monitoring",
      ],
    },
  ];
}
