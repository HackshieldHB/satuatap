-- AlterEnum: add the app-administrator role
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin';

-- CreateTable: admin-editable role → menu visibility overrides
CREATE TABLE IF NOT EXISTS "MenuVisibility" (
    "role" "UserRole" NOT NULL,
    "menuKey" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuVisibility_pkey" PRIMARY KEY ("role","menuKey")
);
