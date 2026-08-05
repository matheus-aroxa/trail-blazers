-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('pending', 'done', 'failed');

-- AlterTable
ALTER TABLE "vacancies" ADD COLUMN     "parse_status" "ParseStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "parse_failure_reason" TEXT;

-- Backfill: vagas que já tinham confianca gravada terminaram a analise.
UPDATE "vacancies" SET "parse_status" = 'done' WHERE "parse_confidence" IS NOT NULL;

-- Backfill: vagas sem confianca sao analises orfas (o processo caiu antes de gravar)
-- e nunca vao terminar sozinhas, entao entram como falha.
UPDATE "vacancies"
SET "parse_status" = 'failed', "parse_failure_reason" = 'backfill_orphan'
WHERE "parse_confidence" IS NULL;
