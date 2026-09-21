import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planning",
  "active",
  "paused",
  "completed",
]);

/**
 * Mirrors the Supabase `auth.users` id — no password/email columns live
 * here, Supabase Auth owns those. This table just gives us a stable FK
 * target for app-owned data.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("planning").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * One row per stack recommendation *evaluation* on a project — never
 * updated in place when re-evaluated (a new version is inserted instead),
 * so re-running the questionnaire preserves history. `chosenSlug` and
 * `rationale` ARE updated in place on the same row once the user accepts
 * a pick and/or asks for the AI explanation.
 *
 * References the stack catalog (`STACK_CATALOG` in
 * packages/api/src/stack-advisor/catalog.ts) by slug rather than a DB
 * foreign key — that catalog is static application data, not something
 * users edit, so there's no separate `stack_options` table to keep in
 * sync.
 */
export const stackDecisions = pgTable("stack_decisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  version: integer("version").notNull(),
  // Mirrors packages/api's QuestionnaireAnswers shape — duplicated here
  // (rather than importing it) since packages/db must not depend on
  // packages/api, which depends on packages/db.
  questionnaireAnswers: jsonb("questionnaire_answers").notNull().$type<{
    teamSize: "solo" | "small" | "medium" | "large";
    budgetTier: "free" | "low" | "medium" | "high";
    timelineWeeks: number;
    platformTargets: ("web" | "mobile" | "desktop" | "api")[];
    realtimeNeeds: boolean;
  }>(),
  rankedOptions: jsonb("ranked_options").notNull().$type<
    {
      slug: string;
      score: number;
      reasons: string[];
    }[]
  >(),
  rationale: text("rationale"),
  chosenSlug: text("chosen_slug"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const milestones = pgTable("milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  milestoneId: uuid("milestone_id").references(() => milestones.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  status: taskStatusEnum("status").default("todo").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  stackDecisions: many(stackDecisions),
  milestones: many(milestones),
  tasks: many(tasks),
}));

export const stackDecisionsRelations = relations(
  stackDecisions,
  ({ one }) => ({
    project: one(projects, {
      fields: [stackDecisions.projectId],
      references: [projects.id],
    }),
  }),
);

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
}));
