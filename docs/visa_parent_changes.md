# Visa Pages as WebPage Parents - Implementation Details & Rollback Guide

## Overview
This document outlines the changes made to allow `Visa` pages to act as parent pages for `WebPage` documents. This enables URLs like `https://musafirbaba.com/visa/china-visa/documents` where `/documents` is a child WebPage of the `china-visa` Visa page.

## Changes Made

### 1. Database Schema (`backend/src/models/WebPage.js`)
- Introduced polymorphic relationships via the `parentModel` field (`enum: ["WebPage", "Visa"]`).
- Updated the `parent` field to use `refPath: "parentModel"` instead of a static `ref: "WebPage"`.
- Modified the `pre("save")` and `updateFullSlugRecursively` hooks to properly generate the `fullSlug`. For WebPage parents, it continues to use `${parent.fullSlug}/${this.slug}`. For Visa parents, it uses `visa/${parent.slug}/${this.slug}`.

### 2. Backend API (`backend/src/controllers/webPage.controller.js`)
- **`getAllParents`**: Modified to query both `WebPage.find({ isParent: true })` and `Visa.find({ isActive: true })`. Merged the results and appended the correct `parentModel` property to each item.
- **`getWebPage`**: Updated the parent slug filter to search both `WebPage` and `Visa` collections to correctly resolve the parent `_id`.

### 3. Frontend Forms (`frontend/src/app/admin/webpage/new/page.tsx` & `edit/[id]/page.tsx`)
- Updated the `WebpageFormData` interface to include `parentModel?: string`.
- Updated the `onSubmit` logic to identify the correct `parentModel` from the `allparents` array based on the selected dropdown value, and send it to the backend.

### 4. Data Migration (`backend/scripts/migrate_webpage_parents.js`)
- A one-time migration script was executed to update existing WebPages that had a parent. It set `parentModel: "WebPage"` to ensure Mongoose's `refPath` functionality works for older documents.

---

## Rollback Instructions

If anything goes wrong and you need to revert to the old behavior where WebPages can only have other WebPages as parents, follow these steps:

### 1. Revert Database Schema (`backend/src/models/WebPage.js`)
- Remove the `parentModel` field.
- Revert the `parent` field back to:
  ```javascript
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WebPage",
  },
  ```
- Revert the `pre("save")` hook to:
  ```javascript
  webPageSchema.pre("save", async function (next) {
    const parent = this.parent ? await this.model("WebPage").findById(this.parent) : null;
    this.slug = slugify(this.slug, { lower: true, strict: true });
    this.fullSlug = parent ? `${parent.fullSlug}/${this.slug}` : this.slug;
    next();
  });
  ```
- Revert the `updateFullSlugRecursively` method to:
  ```javascript
  webPageSchema.methods.updateFullSlugRecursively = async function () {
    let parent = this.parent ? await this.model("WebPage").findById(this.parent) : null;
    const oldFullSlug = this.fullSlug;
    this.fullSlug = parent ? `${parent.fullSlug}/${this.slug}` : this.slug;
    await this.save({ validateBeforeSave: false });
    // ... (keep the rest of the method)
  };
  ```

### 2. Revert Backend Controllers (`backend/src/controllers/webPage.controller.js`)
- **`getAllParents`**: Revert back to only querying `WebPage`.
  ```javascript
  const getAllParents = async (req, res) => {
    try {
      const parents = await WebPage.find({ isParent: true }).select("title slug").lean();
      res.status(200).json({ success: true, data: parents });
    } catch (error) { ... }
  };
  ```
- **`getWebPage`**: Revert the parent filter logic.
  ```javascript
  if (req.query?.parent) {
    const parent = await WebPage.findOne({ slug: req.query.parent }).lean();
    if (!parent) return res.status(404).json({ success: false, message: "Invalid Slug" });
    filter.parent = parent._id;
  }
  ```

### 3. Revert Frontend Forms
- In both `new/page.tsx` and `edit/[id]/page.tsx`, remove the `parentModel` logic from the `onSubmit` function.
  ```typescript
  function onSubmit(values: WebpageFormData) {
    mutation.mutate({ ...values });
  }
  ```
- Remove `parentModel?: string;` from the `WebpageFormData` interface.

### 4. Cleanup Database (Optional)
If you wish to clean up the database of any pages that were assigned a Visa as a parent during this period, you can find them using this query:
```javascript
db.webpages.find({ parentModel: "Visa" })
```
You can manually update these documents to remove their `parent` and `parentModel` references or delete them completely.
