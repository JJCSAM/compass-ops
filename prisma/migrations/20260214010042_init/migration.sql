-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PM', 'FIELD', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('INTAKE', 'RESEARCH', 'FIELD', 'DRAFTING', 'QAQC', 'DELIVERED', 'INVOICED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('CONSTRUCTION_STAKING', 'DESIGN_SURVEY', 'ILC', 'BOUNDARY', 'ALTA', 'SITE_PLAN', 'SUBDIVISION', 'LEGAL_DESCRIPTION');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('RESEARCH', 'FIELD', 'DRAFTING', 'QAQC', 'DELIVER', 'INVOICE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "stage" "ProjectStage" NOT NULL DEFAULT 'INTAKE',
    "clientName" TEXT,
    "siteAddress" TEXT,
    "jurisdiction" TEXT,
    "dueTarget" TIMESTAMP(3),
    "dueHard" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "estimateDays" DECIMAL(65,30),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectNumber_key" ON "Project"("projectNumber");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
