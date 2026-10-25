-- Better Auth used to add a second row for an identifier on a resend. Keep the
-- newest row per identifier so the unique index below can be created on a
-- database that already holds one-time codes.
DELETE FROM `verification` WHERE `rowid` NOT IN (SELECT max(`rowid`) FROM `verification` GROUP BY `identifier`);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_identifier_unique` ON `verification` (`identifier`);
