import { Counter } from "../models/Counter.js";

const createCounter = async (req, res) => {
  try {
    const counter = await Counter.create({
      count: 1000,
    });
    res.status(201).json(counter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create counter" });
  }
};

const getCounter = async (req, res) => {
  try {
    const { id } = req.params;
    const counter = await Counter.findById(id).exec();
    if (!counter) {
      return res.status(404).json({ error: "Counter not found" });
    }
    res.status(200).json(counter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get counter" });
  }
};

const updateCounter = async (req, res) => {
  try {
    const { id } = req.params;
    const counter = await Counter.findByIdAndUpdate(
      id,
      { $inc: { count: 1 } },
      { new: true }
    );
    if (!counter) {
      return res.status(404).json({ error: "Counter not found" });
    }
    res.status(200).json(counter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update counter" });
  }
};

export { createCounter, getCounter, updateCounter };
