-- Manual migration (run once) for the schema simplification described in
-- PLAN.md step 6: STACK_CATALOG is static application data, not user data,
-- so stack_options/task_templates don't need to be DB tables — the
-- catalog is referenced by slug instead of a uuid FK.
alter table stack_decisions drop constraint if exists stack_decisions_chosen_stack_option_id_stack_options_id_fk;
alter table stack_decisions rename column recommendations to ranked_options;
alter table stack_decisions drop column chosen_stack_option_id;
alter table stack_decisions add column chosen_slug text;
alter table stack_decisions add column rationale text;

drop table if exists task_templates;
drop table if exists stack_options;
