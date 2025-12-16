import { Document } from "../models/Document.js";

const createDocument = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { name, media } = req.body;
    if (!name || !media) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const document = new Document({ name, media, userId });
    await document.save();
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    console.log("Document creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateDocument = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const newDocument = await Document.findOneAndUpdate({ _id: id }, req.body, {
      new: true,
    });
    res.status(200).json({ success: true, data: newDocument });
  } catch (error) {
    console.log("Document update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const getMyAllDocuments = async (req, res) => {
  try {
    const userId = req.user.sub;
    const documents = await Document.find({ userId });
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    console.log("Document getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const document = await Document.findById(id);
    if (!document) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    res
      .status(200)
      .json({
        success: true,
        data: document,
        message: "Document fetched successfully by id",
      });
  } catch (error) {
    console.log("Document getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export { createDocument, updateDocument, getMyAllDocuments, getDocumentById };
