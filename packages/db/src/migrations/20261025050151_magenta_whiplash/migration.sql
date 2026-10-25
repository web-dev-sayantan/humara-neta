CREATE TABLE `card` (
	`id` text PRIMARY KEY,
	`quote_id` text NOT NULL,
	`position` integer NOT NULL,
	`text` text NOT NULL,
	CONSTRAINT `fk_card_quote_id_quote_id_fk` FOREIGN KEY (`quote_id`) REFERENCES `quote`(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote` (
	`id` text PRIMARY KEY,
	`person_id` text NOT NULL,
	`slug` text NOT NULL,
	`editorial_note` text NOT NULL,
	`date` text,
	`place` text,
	`archived_at` integer,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_quote_person_id_person_id_fk` FOREIGN KEY (`person_id`) REFERENCES `person`(`id`),
	CONSTRAINT `fk_quote_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`),
	CONSTRAINT `fk_quote_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `card_quote_position_unique` ON `card` (`quote_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `quote_person_slug_unique` ON `quote` (`person_id`,`slug`);