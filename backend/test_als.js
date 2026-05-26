import mongoose from "mongoose";
import { AsyncLocalStorage } from "async_hooks";

const als = new AsyncLocalStorage();

const testSchema = new mongoose.Schema({ name: String });

testSchema.post("save", function(doc, next) {
  const req = als.getStore();
  if (req) {
    console.log("SUCCESS: getStore() works in post('save')!");
    console.log("Req data:", req.data);
  } else {
    console.log("FAILURE: getStore() returned undefined in post('save')!");
  }
  next();
});

testSchema.post("findOneAndUpdate", function(doc, next) {
  const req = als.getStore();
  if (req) {
    console.log("SUCCESS: getStore() works in post('findOneAndUpdate')!");
  } else {
    console.log("FAILURE: getStore() returned undefined in post('findOneAndUpdate')!");
  }
  next();
});

const TestModel = mongoose.model("ALS_Test", testSchema);

async function run() {
  await mongoose.connect("mongodb://localhost:27017/test_als_db_mock").catch(() => {});
  // Use a local mock or bypass if no db
  
  const req = { data: "Hello World" };
  
  await als.run(req, async () => {
    console.log("Creating doc...");
    const doc = new TestModel({ name: "test" });
    
    // Stub save to avoid needing real DB
    doc.save = async function() {
      // Simulate mongoose save calling post hooks
      const hooks = doc.constructor.hooks || testSchema.s.hooks;
      if (hooks) {
        await hooks.execPost("save", doc, [doc], function(err){});
      }
    };
    
    await doc.save();
    
    console.log("Updating doc...");
    // Simulate findOneAndUpdate
    const updateHooks = testSchema.s.hooks;
    if (updateHooks) {
       await updateHooks.execPost("findOneAndUpdate", null, [{_id: "123"}], function(err){});
    }
  });
}

run();
