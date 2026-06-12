import mongoose from "mongoose";

mongoose.connect("mongodb://localhost:27017/test_db");

const schemaOld = new mongoose.Schema({
  coverImage: {
    url: String,
    alt: String
  }
});

const schemaNew = new mongoose.Schema({
  coverImage: [{
    url: String,
    alt: String
  }]
});

const ModelOld = mongoose.model("TestOld", schemaOld, "tests");
const ModelNew = mongoose.model("TestNew", schemaNew, "tests");

async function run() {
  await mongoose.connection.dropDatabase();
  const doc = await ModelOld.create({ coverImage: { url: "test1", alt: "alt1" } });
  console.log("Old doc created:", doc);

  const found = await ModelNew.findById(doc._id);
  console.log("Found with new schema:", found);
  process.exit(0);
}

run();
