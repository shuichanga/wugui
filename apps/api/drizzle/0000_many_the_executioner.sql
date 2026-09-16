CREATE TABLE `household_members` (
	`household_id` varchar(32) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`role` varchar(16) NOT NULL DEFAULT 'member',
	`joined_at` datetime NOT NULL,
	CONSTRAINT `household_members_household_id_user_id_pk` PRIMARY KEY(`household_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` varchar(32) NOT NULL,
	`name` varchar(64) NOT NULL,
	`invite_code` varchar(8) NOT NULL,
	`created_by` varchar(32) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `households_id` PRIMARY KEY(`id`),
	CONSTRAINT `households_invite_code_unique` UNIQUE(`invite_code`)
);
--> statement-breakpoint
CREATE TABLE `item_photos` (
	`id` varchar(32) NOT NULL,
	`item_id` varchar(32) NOT NULL,
	`oss_key` varchar(512) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	CONSTRAINT `item_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_tags` (
	`item_id` varchar(32) NOT NULL,
	`tag` varchar(64) NOT NULL,
	CONSTRAINT `item_tags_item_id_tag_pk` PRIMARY KEY(`item_id`,`tag`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` varchar(32) NOT NULL,
	`household_id` varchar(32) NOT NULL,
	`location_id` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`owner_id` varchar(32) NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` varchar(32) NOT NULL,
	`household_id` varchar(32) NOT NULL,
	`parent_id` varchar(32),
	`level` varchar(20) NOT NULL,
	`name` varchar(64) NOT NULL,
	`icon` varchar(32),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recent_views` (
	`user_id` varchar(32) NOT NULL,
	`item_id` varchar(32) NOT NULL,
	`viewed_at` datetime NOT NULL,
	CONSTRAINT `recent_views_user_id_item_id_pk` PRIMARY KEY(`user_id`,`item_id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(32) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`plan_type` varchar(32) NOT NULL DEFAULT 'free',
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`payment_provider` varchar(16),
	`transaction_id` varchar(128),
	`expires_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_changes` (
	`id` varchar(32) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`entity` varchar(32) NOT NULL,
	`entity_id` varchar(32) NOT NULL,
	`op` varchar(16) NOT NULL,
	`data_json` text,
	`client_timestamp` datetime NOT NULL,
	`synced_at` datetime NOT NULL,
	CONSTRAINT `sync_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(32) NOT NULL,
	`username` varchar(32),
	`email` varchar(255),
	`email_verified` boolean NOT NULL DEFAULT false,
	`password_hash` varchar(255),
	`provider` varchar(16) NOT NULL DEFAULT 'email',
	`openid` varchar(64),
	`unionid` varchar(64),
	`phone` varchar(20),
	`phone_verified` boolean NOT NULL DEFAULT false,
	`display_name` varchar(64),
	`avatar_key` varchar(255),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_household_members_user` ON `household_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_item_photos_item` ON `item_photos` (`item_id`);--> statement-breakpoint
CREATE INDEX `idx_item_tags_tag` ON `item_tags` (`tag`);--> statement-breakpoint
CREATE INDEX `idx_items_household` ON `items` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_items_location` ON `items` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_items_name` ON `items` (`name`);--> statement-breakpoint
CREATE INDEX `idx_locations_household` ON `locations` (`household_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_parent` ON `locations` (`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_recent_views_user_time` ON `recent_views` (`user_id`,`viewed_at`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_user` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sync_user_time` ON `sync_changes` (`user_id`,`client_timestamp`);--> statement-breakpoint
CREATE INDEX `idx_users_openid` ON `users` (`openid`);--> statement-breakpoint
CREATE INDEX `idx_users_unionid` ON `users` (`unionid`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone`);