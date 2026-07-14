-- Multiline Promotional - Database Setup Script
-- Run this against your PostgreSQL database BEFORE starting the server.
-- Compatible with PostgreSQL 13+

-- Sessions table (required for authentication)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY NOT NULL,
  "email" varchar,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS "products" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "sku" text NOT NULL,
  "price" numeric(10, 2) NOT NULL,
  "moq" integer DEFAULT 1 NOT NULL,
  "category" text NOT NULL,
  "image_url" text NOT NULL,
  "is_featured" boolean DEFAULT false,
  "colors" text[],
  "specifications" jsonb,
  "created_at" timestamp DEFAULT now()
);

-- Quote Requests table
CREATE TABLE IF NOT EXISTS "quote_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar,
  "company_name" text NOT NULL,
  "contact_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "total_estimated_value" numeric(10, 2),
  "created_at" timestamp DEFAULT now()
);

-- Quote Items table
CREATE TABLE IF NOT EXISTS "quote_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "quote_request_id" integer NOT NULL,
  "product_id" integer NOT NULL,
  "quantity" integer NOT NULL,
  "customization_notes" text,
  "logo_url" text
);

-- Contact Messages table
CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
