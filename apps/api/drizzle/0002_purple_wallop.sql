ALTER TABLE `items` ADD `deleted_at` datetime;--> statement-breakpoint
ALTER TABLE `locations` ADD `deleted_at` datetime;--> statement-breakpoint
ALTER TABLE `sync_changes` ADD `household_id` varchar(36) NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_sync_household_time` ON `sync_changes` (`household_id`,`synced_at`);