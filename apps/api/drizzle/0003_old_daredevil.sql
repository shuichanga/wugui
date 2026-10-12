CREATE TABLE `wechat_pay_orders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`out_trade_no` varchar(32) NOT NULL,
	`openid` varchar(64) NOT NULL,
	`product_id` varchar(64) NOT NULL,
	`plan_type` varchar(32) NOT NULL,
	`goods_price` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`attach` varchar(255),
	`env` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`wx_order_id` varchar(128),
	`paid_at` datetime,
	`delivered_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `wechat_pay_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `wechat_pay_orders_out_trade_no_unique` UNIQUE(`out_trade_no`)
);
--> statement-breakpoint
CREATE INDEX `idx_wxpay_orders_user` ON `wechat_pay_orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_wxpay_orders_wx_order` ON `wechat_pay_orders` (`wx_order_id`);--> statement-breakpoint
CREATE INDEX `idx_wxpay_orders_status` ON `wechat_pay_orders` (`status`);