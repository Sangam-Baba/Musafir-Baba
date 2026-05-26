import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import connectDb from "./src/config/db.js";
import { WebPage } from "./src/models/WebPage.js";
import { auditContext } from "./src/middleware/auditInterceptor.js";
import "./src/config/mongoosePluginInit.js"; // attach plugin

async function test() {
  await connectDb();
  
  const webpage = await WebPage.findOne();
  if (!webpage) {
    console.log("No webpage found");
    process.exit(0);
  }

  const fakeReq = {
    user: { _id: "60c72b2f9b1d8b0015f3a0a1", name: "Test User", role: "admin" },
    logAction: (payload) => {
      console.log("LOG ACTION CALLED!!!", payload);
    }
  };

  auditContext.run(fakeReq, async () => {
    console.log("Running update...");
    const updated = await WebPage.findByIdAndUpdate(webpage._id, { title: webpage.title + " test" }, { new: true });
    console.log("Update complete:", updated.title);
  });
}

test();
