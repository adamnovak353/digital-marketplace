-- CreateTable
CREATE TABLE IF NOT EXISTS "marketplace_state" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_state_pkey" PRIMARY KEY ("id")
);
