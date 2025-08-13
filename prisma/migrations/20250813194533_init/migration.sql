-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "salary" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Worker_name_key" ON "Worker"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Worker_email_key" ON "Worker"("email");
