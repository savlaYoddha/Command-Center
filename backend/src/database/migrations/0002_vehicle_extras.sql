ALTER TABLE "vehicles" ADD COLUMN "loan_id" text;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "front_tyre" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "rear_tyre" text DEFAULT '' NOT NULL;