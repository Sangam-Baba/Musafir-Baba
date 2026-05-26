import { auditContext } from "./auditInterceptor.js";

const EXCLUDED_MODELS = ["AuditLog", "AuthLog", "Session"];

const extractTitle = (doc) => {
  if (!doc) return "N/A";
  return doc.title || doc.name || doc.email || doc.heading || doc.invoiceNumber || doc.question || "N/A";
};

export function auditPlugin(schema, options) {
  // Pre-hook for findOneAndUpdate
  schema.pre("findOneAndUpdate", async function (next) {
    if (EXCLUDED_MODELS.includes(this.model.modelName)) return next();
    
    console.log(`[AuditPlugin] PRE hook triggered for ${this.model.modelName}`);
    
    const req = auditContext.getStore();
    if (req) {
      console.log(`[AuditPlugin] Found AsyncLocalStorage req Context`);
    }
    
    if (req && req.user && req.logAction) {
      try {
        this._originalDoc = await this.model.findOne(this.getQuery()).lean();
        console.log(`[AuditPlugin] Successfully captured oldValue for ${this.model.modelName}`);
      } catch (err) {
        console.log(`[AuditPlugin] Error capturing oldValue:`, err.message);
      }
    }
    next();
  });

  // Post-hook for findOneAndUpdate
  schema.post("findOneAndUpdate", function (doc, next) {
    if (!doc || EXCLUDED_MODELS.includes(this.model.modelName)) return next();
    
    console.log(`[AuditPlugin] POST hook triggered for ${this.model.modelName}`);
    
    const req = auditContext.getStore();
    
    console.log(`[AuditPlugin] Evaluating post-hook conditions: req=${!!req}, req.user=${!!(req&&req.user)}, req.logAction=${!!(req&&req.logAction)}, doc=${!!doc}`);

    if (req && req.user && req.logAction && doc) {
      try {
        console.log(`[AuditPlugin] Calling req.logAction for UPDATE`);
        req.logAction({
          actionType: "UPDATE",
          moduleName: options?.moduleName || this.model.modelName,
          entityId: doc._id,
          documentTitle: extractTitle(doc),
          description: `Updated ${this.model.modelName} record`,
          oldValue: this._originalDoc,
          newValue: doc,
        });
      } catch (err) {}
    }
    next();
  });

  // Post-hook for save (CREATE)
  schema.post("save", function (doc, next) {
    if (!doc || EXCLUDED_MODELS.includes(doc.constructor.modelName)) return next();
    const req = auditContext.getStore();
    if (req && req.user && req.logAction) {
      try {
        req.logAction({
          actionType: this.isNew ? "CREATE" : "UPDATE",
          moduleName: options?.moduleName || doc.constructor.modelName,
          entityId: doc._id,
          documentTitle: extractTitle(doc),
          description: `${this.isNew ? "Created" : "Updated"} ${doc.constructor.modelName} record`,
          newValue: doc,
        });
      } catch (err) {}
    }
    next();
  });

  // Post-hook for findOneAndDelete (DELETE)
  schema.post("findOneAndDelete", function (doc, next) {
    if (!doc || EXCLUDED_MODELS.includes(this.model.modelName)) return next();
    const req = auditContext.getStore();
    if (req && req.user && req.logAction && doc) {
      try {
        req.logAction({
          actionType: "DELETE",
          moduleName: options?.moduleName || this.model.modelName,
          entityId: doc._id,
          documentTitle: extractTitle(doc),
          description: `Deleted ${this.model.modelName} record`,
          oldValue: doc,
        });
      } catch (err) {}
    }
    next();
  });
}
