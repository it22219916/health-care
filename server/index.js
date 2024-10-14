const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const fileUpload = require("express-fileupload");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// Environment Variables
const DB_USER = process.env.DB_USER;
const DB_PASS = encodeURIComponent(process.env.DB_PASS); // URL-encode if necessary
const DB_NAME = "SmartCare"; // Adjust as needed

const uri = `mongodb+srv://${DB_USER}:${DB_PASS}@cluster0.qz6lguv.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db(DB_NAME);
    const doctorsCollection = database.collection("doctors");
    const appointmentsCollection = database.collection("Appointments");
    const usersCollection = database.collection("users"); // Added

    // Routes

    // Get all doctors
    app.get("/doctors", async (req, res) => {
      try {
        const doctors = await doctorsCollection.find({}).toArray();
        res.json(doctors);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch doctors." });
      }
    });

    // Get approved doctors
    app.get("/approvedDoctors", async (req, res) => {
      try {
        const doctors = await doctorsCollection
          .find({ approved: "true" })
          .toArray();
        res.json(doctors);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch approved doctors." });
      }
    });

    // Get pending doctors
    app.get("/pendingDoctors", async (req, res) => {
      try {
        const doctors = await doctorsCollection
          .find({ approved: "false" })
          .toArray();
        res.json(doctors);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch pending doctors." });
      }
    });

    // Delete doctor
    app.delete("/doctors/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await doctorsCollection.deleteOne({ _id: ObjectId(id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to delete doctor." });
      }
    });

    // Approve doctor
    app.put("/approve/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await doctorsCollection.updateOne(
          { _id: ObjectId(id) },
          { $set: { approved: "true" } }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to approve doctor." });
      }
    });

    // Get doctor by email
    app.get("/doctors/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const doctor = await doctorsCollection.findOne({ email });
        res.json(doctor);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch doctor." });
      }
    });

    // Create appointment
    app.post("/appointments", async (req, res) => {
      try {
        const appointment = req.body;
        const result = await appointmentsCollection.insertOne(appointment);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to create appointment." });
      }
    });

    // Get all appointments
    app.get("/appointments", async (req, res) => {
      try {
        const appointments = await appointmentsCollection.find({}).toArray();
        res.json(appointments);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch appointments." });
      }
    });

    // Add doctor with image
    app.post("/doctors", async (req, res) => {
      try {
        const doctor = req.body;
        if (!req.files || !req.files.image) {
          return res.status(400).send("No image uploaded.");
        }
        const pic = req.files.image;
        const picData = pic.data;
        const encodedPic = picData.toString("base64");
        const imageBuffer = Buffer.from(encodedPic, "base64");
        doctor.image = imageBuffer;
        const result = await doctorsCollection.insertOne(doctor);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to add doctor." });
      }
    });

    // Get patient by ID
    app.get("/patients/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const patient = await appointmentsCollection.findOne({
          _id: ObjectId(id),
        });
        res.json(patient);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch patient." });
      }
    });

    // Delete patient by ID
    app.delete("/patients/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await appointmentsCollection.deleteOne({
          _id: ObjectId(id),
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to delete patient." });
      }
    });

    // Update doctor
    app.put("/doctors/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updateDoc = { $set: req.body };
        const result = await doctorsCollection.updateOne(
          { _id: ObjectId(id) },
          updateDoc
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to update doctor." });
      }
    });

    // Add user
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to add user." });
      }
    });

    // Upsert user
    app.put("/users", async (req, res) => {
      try {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to upsert user." });
      }
    });

    // Check if user is a student
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email });
        const isStudent = user?.roles === "student";
        res.json({ student: isStudent });
      } catch (error) {
        res.status(500).json({ error: "Failed to check user role." });
      }
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
  // Removed client.close() to keep the connection open
}

run().catch(console.dir);

// Root Route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Start Server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
