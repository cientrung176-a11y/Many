-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "imageUrl" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "categoryId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Expense" ("amount", "categoryId", "createdAt", "id", "imageUrl", "note", "updatedAt", "userId") SELECT "amount", "categoryId", "createdAt", "id", "imageUrl", "note", "updatedAt", "userId" FROM "Expense";
DROP TABLE "Expense";
ALTER TABLE "new_Expense" RENAME TO "Expense";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
