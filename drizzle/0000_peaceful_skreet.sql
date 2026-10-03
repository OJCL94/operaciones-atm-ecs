CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`ticket_id` text,
	`asset_id` text NOT NULL,
	`owner_id` text,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`created_at` text NOT NULL,
	`planned_at` text,
	`planned_start` text,
	`planned_end` text,
	`started_at` text,
	`completed_at` text,
	`evidence` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "activity_state" CHECK("activities"."status" IN ('pendiente','planificada','en_curso','completada','cancelada')),
	CONSTRAINT "activity_dates" CHECK("activities"."planned_end" IS NULL OR "activities"."planned_end" >= "activities"."planned_start")
);
--> statement-breakpoint
CREATE INDEX `activities_demo_due` ON `activities` (`demo`,`planned_end`);--> statement-breakpoint
CREATE INDEX `activities_ticket` ON `activities` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `resource_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`requirement_id` text NOT NULL,
	`quantity` real NOT NULL,
	`allocated_at` text NOT NULL,
	`actor_id` text NOT NULL,
	`note` text NOT NULL,
	FOREIGN KEY (`requirement_id`) REFERENCES `resource_requirements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "allocated_quantity" CHECK("resource_allocations"."quantity">0)
);
--> statement-breakpoint
CREATE INDEX `allocations_requirement` ON `resource_allocations` (`requirement_id`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`serial` text NOT NULL,
	`model` text NOT NULL,
	`location` text NOT NULL,
	`status` text DEFAULT 'operativo' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "asset_status" CHECK("assets"."status" IN ('operativo','mantenimiento','fuera_servicio','retirado'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_code_demo` ON `assets` (`code`,`demo`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_serial_demo` ON `assets` (`serial`,`demo`);--> statement-breakpoint
CREATE INDEX `assets_demo_status` ON `assets` (`demo`,`status`);--> statement-breakpoint
CREATE TABLE `controls` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`activity_id` text NOT NULL,
	`title` text NOT NULL,
	`finding` text NOT NULL,
	`action` text NOT NULL,
	`owner_id` text NOT NULL,
	`due_at` text NOT NULL,
	`status` text DEFAULT 'abierta' NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "control_state" CHECK("controls"."status" IN ('abierta','en_curso','cerrada'))
);
--> statement-breakpoint
CREATE INDEX `controls_demo_due` ON `controls` (`demo`,`due_at`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`demo` integer NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`ticket_id` text,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_entity` ON `events` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `events_demo_time` ON `events` (`demo`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_ticket` ON `events` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`unit` text NOT NULL,
	`target` real NOT NULL,
	`actual` real,
	`direction` text DEFAULT 'mayor' NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`evaluated_at` text,
	`created_at` text NOT NULL,
	CONSTRAINT "goal_direction" CHECK("goals"."direction" IN ('mayor','menor')),
	CONSTRAINT "goal_dates" CHECK("goals"."end_at" >= "goals"."start_at")
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`indicator` text NOT NULL,
	`week_start` text NOT NULL,
	`numerator` real,
	`denominator` real,
	`value` real,
	`sample_size` integer NOT NULL,
	`source` text NOT NULL,
	`evidence` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `study_periods`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "measurement_sample" CHECK("measurements"."sample_size">=0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `measurement_period_week_indicator` ON `measurements` (`period_id`,`week_start`,`indicator`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`subject` text,
	CONSTRAINT "member_role" CHECK("members"."role" IN ('admin','supervisor','tecnico','solicitante','auditor')),
	CONSTRAINT "member_active" CHECK("members"."active" IN (0,1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_email_unique` ON `members` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_subject_unique` ON `members` (`subject`);--> statement-breakpoint
CREATE TABLE `study_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`label` text NOT NULL,
	`phase` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	CONSTRAINT "period_phase" CHECK("study_periods"."phase" IN ('pretest','postest')),
	CONSTRAINT "period_dates" CHECK("study_periods"."end_at" >= "study_periods"."start_at")
);
--> statement-breakpoint
CREATE TABLE `resource_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`activity_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`required_by` text NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "required_quantity" CHECK("resource_requirements"."quantity">0)
);
--> statement-breakpoint
CREATE INDEX `requirements_activity` ON `resource_requirements` (`activity_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer NOT NULL,
	`ticket_id` text,
	`activity_id` text,
	`kind` text NOT NULL,
	`passed` integer NOT NULL,
	`evidence` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "review_kind" CHECK("reviews"."kind" IN ('categoria','monitoreo','operativa')),
	CONSTRAINT "review_parent" CHECK(("reviews"."ticket_id" IS NOT NULL AND "reviews"."activity_id" IS NULL AND "reviews"."kind" != 'operativa') OR ("reviews"."activity_id" IS NOT NULL AND "reviews"."ticket_id" IS NULL AND "reviews"."kind" = 'operativa')),
	CONSTRAINT "review_result" CHECK("reviews"."passed" IN (0,1))
);
--> statement-breakpoint
CREATE INDEX `reviews_ticket_kind` ON `reviews` (`ticket_id`,`kind`);--> statement-breakpoint
CREATE INDEX `reviews_activity` ON `reviews` (`activity_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`demo` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`code` text NOT NULL,
	`asset_id` text NOT NULL,
	`requester_id` text NOT NULL,
	`assignee_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'abierto' NOT NULL,
	`diagnosis` text DEFAULT '' NOT NULL,
	`solution` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`due_at` text NOT NULL,
	`first_response_at` text,
	`resolved_at` text,
	`closed_at` text,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requester_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ticket_state" CHECK("tickets"."status" IN ('abierto','asignado','en_atencion','en_espera','resuelto','cerrado')),
	CONSTRAINT "ticket_priority" CHECK("tickets"."priority" IN ('critica','alta','media','baja'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_code_unique` ON `tickets` (`code`);--> statement-breakpoint
CREATE INDEX `tickets_demo_state_created` ON `tickets` (`demo`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `tickets_asset` ON `tickets` (`asset_id`);--> statement-breakpoint
CREATE INDEX `tickets_assignee` ON `tickets` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `tickets_requester` ON `tickets` (`requester_id`);