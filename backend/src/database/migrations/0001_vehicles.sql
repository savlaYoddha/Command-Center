CREATE TABLE "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'car' NOT NULL,
	"make" text DEFAULT '' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"variant" text DEFAULT '' NOT NULL,
	"year" bigint,
	"registration_number" text DEFAULT '' NOT NULL,
	"vin" text DEFAULT '' NOT NULL,
	"engine_number" text DEFAULT '' NOT NULL,
	"fuel_type" text DEFAULT '' NOT NULL,
	"transmission" text DEFAULT '' NOT NULL,
	"color" text DEFAULT '' NOT NULL,
	"purchase_date" text,
	"purchase_price" bigint,
	"current_odometer" bigint DEFAULT 0 NOT NULL,
	"current_value" bigint,
	"photo" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"archived" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"updated_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
