# 🗄️ Database Backup & Restore Guide

This repository includes a professional-grade database management system using **MongoDB Database Tools** (`mongodump` & `mongorestore`). This ensures your data is always safe and can be recovered in seconds.

---

## 🛠️ Tools & Infrastructure

1.  **MongoDB Database Tools**: Native utilities used for high-fidelity backups.
    *   `mongodump`: Creates a binary (BSON) snapshot of the database, including all data, indexes, and metadata.
    *   `mongorestore`: Restores a binary snapshot back into a live database.
2.  **Custom Wrapper Scripts**:
    *   `db_backup.js`: A smart script that automates the backup process and manages timestamped folders.
    *   `db_restore.js`: A safety-first script to help you revert to any previous snapshot.

---

## 🚀 How to Backup

To take a full snapshot of your current database:

1.  Open your terminal in the `backend` folder.
2.  Run the following command:
    ```bash
    npm run backup
    ```
3.  **Result**: A new timestamped folder will be created in `backend/backup/` (e.g., `2026-05-16_13-19-09`).

> [!NOTE]
> The `backup/` folder is automatically ignored by Git. Your data will never be uploaded to GitHub.

---

## 🔄 How to Restore

To revert your database to a previous state:

1.  Find the name of the folder you want to restore from inside `backend/backup/`.
2.  Run the following command (replace `<folder_name>` with your actual folder name):
    ```bash
    npm run restore -- 2026-05-16_13-19-09
    ```
3.  **Result**: The target database will be overwritten with the data from that snapshot.

---

## ⚠️ Things to Remember

*   **Data Overwrite**: Restoring a backup is a "destructive" action. It will **drop (delete)** existing collections in the target database before restoring the old data. Always take a fresh backup before restoring an old one.
*   **Environment Variables**: These scripts rely on the `MONGO_URI` defined in your `backend/.env` file. If you change your database, update the `.env` first.
*   **Storage**: Each backup can be large (especially with media metadata). Clean up very old backups periodically to save disk space.
*   **Format**: Our scripts use the **BSON** format (via `mongodump`). This is superior to JSON as it preserves data types (like Dates and ObjectIDs) perfectly.

---

## 🔧 Maintenance

If the scripts fail with a "command not found" error, ensure **MongoDB Database Tools** are installed:
*   **Mac**: `brew tap mongodb/brew && brew install mongodb-database-tools`
*   **Others**: [Download from MongoDB Website](https://www.mongodb.com/try/download/database-tools)
