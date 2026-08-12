/*
  Warnings:

  - A unique constraint covering the columns `[name,category]` on the table `Tag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `category` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('SETUP', 'MISTAKE', 'EMOTION');

-- DropIndex
DROP INDEX "Tag_name_key";

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "category" "TagCategory" NOT NULL;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "followedPlan" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_category_key" ON "Tag"("name", "category");
