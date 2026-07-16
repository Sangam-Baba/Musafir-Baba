const mongoose = require('mongoose');
const schema = new mongoose.Schema({ title: String, slug: String });
schema.pre('findOneAndUpdate', function() {
  console.log("Update:", this.getUpdate());
});
const Model = mongoose.model('Test', schema);
const update = { title: "Hello", slug: "hello" };
const doc = new Model();
const q = Model.findByIdAndUpdate(doc._id, update);
q.exec().catch(() => {});
