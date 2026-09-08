// Import Express framework for building the web server
const express = require("express");

// Load notes from the JSON file (or start with empty array if file doesn't exist)
const fs = require("fs");
const path = require("path");

// Create an Express application instance
const app = express();

// Port the server will listen on
const PORT = process.env.PORT || 3000;

// Path to the JSON file used for storage
const DATA_FILE = path.join(__dirname, "data.json");

// Middleware to parse JSON request bodies so req.body works
app.use(express.json());

// Track the next ID to assign to new records
let nextId = 1;

// Helper function: load notes from the JSON file
function loadNotes() {
  try {
    // Read the file contents
    const data = fs.readFileSync(DATA_FILE, "utf8");
    // Parse JSON and return the notes array
    if (data) {
      const notes = JSON.parse(data);
      // Update nextId so new records don't clash with existing IDs
      nextId = notes.length ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
      return notes;
    }
  } catch (err) {
    // If the file doesn't exist or is invalid, return an empty array
    return [];
  }
  return [];
}

// Helper function: save notes to the JSON file
function saveNotes(notes) {
  // Write the notes array to the file with pretty formatting (2-space indent)
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
}

// -- ROUTES ----------------------------------------------------------------

// GET /api/notes -> Return all notes
app.get("/api/notes", (req, res) => {
  // Load notes from storage
  const notes = loadNotes();
  // Optional query param: /api/notes?completed=true to filter
  if (req.query.completed !== undefined) {
    const completed = req.query.completed === "true";
    // Return only the filtered subset
    return res.json(notes.filter((n) => n.completed === completed));
  }
  // Return all notes as JSON
  res.json(notes);
});

// GET /api/notes/:id -> Return a single note by its ID
app.get("/api/notes/:id", (req, res) => {
  // Load notes and parse the ID from the URL (as a number)
  const notes = loadNotes();
  const id = parseInt(req.params.id);

  // Find the note with the matching ID
  const note = notes.find((n) => n.id === id);

  // If note not found, return 404 with an error message
  if (!note) {
    return res.status(404).json({ error: "Note not found" });
  }

  // Return the found note
  res.json(note);
});

// POST /api/notes -> Add a new note
app.post("/api/notes", (req, res) => {
  // Destructure the fields from the request body
  const { title, content, completed } = req.body;

  // Validate: title is required
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  // Load existing notes
  const notes = loadNotes();

  // Create a new note object with a unique ID and timestamp
  const newNote = {
    id: nextId++,
    title: title,
    content: content || "",
    completed: completed || false,
    createdAt: new Date().toISOString(),
  };

  // Add the new note to the array
  notes.push(newNote);

  // Save the updated array back to file
  saveNotes(notes);

  // Return the created note with a 201 (Created) status
  res.status(201).json(newNote);
});

// PUT /api/notes/:id -> Update a note (full update)
app.put("/api/notes/:id", (req, res) => {
  // Load notes and parse the ID from the URL
  const notes = loadNotes();
  const id = parseInt(req.params.id);

  // Find the index of the note to update
  const index = notes.findIndex((n) => n.id === id);

  // If note not found, return 404
  if (index === -1) {
    return res.status(404).json({ error: "Note not found" });
  }

  // Destructure fields from request body
  const { title, content, completed } = req.body;

  // Update the note fields with provided values
  if (title !== undefined) notes[index].title = title;
  if (content !== undefined) notes[index].content = content;
  if (completed !== undefined) notes[index].completed = completed;

  // Save the updated array
  saveNotes(notes);

  // Return the updated note
  res.json(notes[index]);
});

// DELETE /api/notes/:id -> Delete a note
app.delete("/api/notes/:id", (req, res) => {
  // Load notes and parse the ID from the URL
  let notes = loadNotes();
  const id = parseInt(req.params.id);

  // Track the total count before deletion
  const beforeCount = notes.length;

  // Remove the note with the matching ID
  notes = notes.filter((n) => n.id !== id);

  // If nothing was removed, the ID was not found
  if (notes.length === beforeCount) {
    return res.status(404).json({ error: "Note not found" });
  }

  // Save the updated array
  saveNotes(notes);

  // Return a success message
  res.json({ message: "Note deleted successfully", id: id });
});

// -- Root route ------------------------------------------------------------

// GET / -> Basic info about available endpoints
app.get("/", (req, res) => {
  res.json({
    message: "Simple Notes REST API",
    endpoints: {
      "GET /api/notes": "List all notes",
      "GET /api/notes/:id": "Get a single note",
      "POST /api/notes": "Create a note",
      "PUT /api/notes/:id": "Update a note",
      "DELETE /api/notes/:id": "Delete a note",
    },
  });
});

// -- Start server ----------------------------------------------------------

// Start the server and log confirmation
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
