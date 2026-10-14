CREATE TABLE `app_config` (
	`config_key` varchar(64) NOT NULL,
	`config_value` text NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `app_config_config_key` PRIMARY KEY (`config_key`)
);
