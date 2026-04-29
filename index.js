const express = require("express");
const app = express();
const port = 80;

//app.use(require("cors")())

const sqlite3 = require("sqlite3").verbose();

const fs = require("fs");
const util = require("util");

const runtimeFolder = "./runtime";
const filesFolder = "./runtime/files";

// Check if the runtime folder exists, create it if it doesn't
if (!fs.existsSync(runtimeFolder)) {
  fs.mkdirSync(runtimeFolder);
}

// Check if the files folder exists, create it if it doesn't
if (!fs.existsSync(filesFolder)) {
  fs.mkdirSync(filesFolder);
}

db = new sqlite3.Database("runtime/database.db");
db.serialize(() => {
  db.run(`
        CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        filename TEXT,
        token TEXT,
        ttl INTEGER
    )`);
});

function makeToken() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < 64) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

app.use(express.static("dist"));

// Only parse JSON for specific API endpoints that need it (not file uploads)
app.use("/api/isValid/", express.json({ limit: "10mb" }));
app.use("/api/delete/", express.json({ limit: "10mb" }));
app.use("/api/keepup/", express.json({ limit: "10mb" }));

app.get("/api/isValid/:fileId", (req, res) => {
  console.log("idcheck: " + req.params.fileId);

  db.get(
    `SELECT id FROM files WHERE id = ?`,
    [req.params.fileId],
    (err, row) => {
      if (err) {
        console.error(err.message);
      } else if (row) {
        res.send({ file: true });
      } else {
        res.send({ file: false });
      }
    },
  );
});

app.get("/api/access/:fileId", (req, res) => {
  console.log("file requested: " + req.params.fileId);

  res.sendFile("files/" + req.params.fileId, { root: "runtime" });
});

app.get("/api/filename/:fileId", (req, res) => {
  console.log("filename: " + req.params.fileId);

  db.get(
    `SELECT filename FROM files WHERE id = ?`,
    [req.params.fileId],
    (err, row) => {
      if (err) {
        console.error(err.message);
      } else if (row) {
        res.send(row);
      }
    },
  );
});

app.post("/api/delete/:fileId", (req, res) => {
  console.log("removing: " + req.params.fileId);

  db.get(
    `SELECT token FROM files WHERE id = ?`,
    [req.params.fileId],
    (err, row) => {
      if (err) {
        console.error(err.message);
      } else if (row) {
        if (row.token != req.body.token) return res.status(500).send(err);
        db.serialize(() => {
          db.run(`DELETE FROM files WHERE id = ?`, [req.params.fileId]);
        });

        fs.rm("runtime/files/" + req.params.fileId, () => {});
        res.sendStatus(200);
      }
    },
  );
});

app.post("/api/keepup/:fileId", (req, res) => {
  console.log("keeping: " + req.params.fileId);

  db.get(
    `SELECT token FROM files WHERE id = ?`,
    [req.params.fileId],
    (err, row) => {
      if (err) {
        console.error(err.message);
      } else if (row) {
        if (row.token != req.body.token) return res.status(500).send(err);
        db.serialize(() => {
          db.run(`UPDATE files SET ttl = ? WHERE id = ?`, [
            6,
            req.params.fileId,
          ]);
        });
        res.sendStatus(200);
      }
    },
  );
});

const formidable = require("formidable");

app.post("/api/upload", async (req, res) => {
  const form = formidable({
    multiples: false,
    uploadDir: "runtime/files/",
    maxFileSize: 100 * 1024 * 1024, // 100MB per chunk
    keepExtensions: true,
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).send(err);
    }

    // Handle file - in formidable v2 it might be an array even with multiples: false
    let file = files.file;
    if (Array.isArray(file)) {
      file = file[0];
    }

    const getField = (field, defaultValue) => {
      if (Array.isArray(field)) return field[0];
      if (field != null) return field;
      return defaultValue;
    };

    const chunkIndex = parseInt(getField(fields.chunkIndex, 0), 10) || 0;
    const totalChunks = parseInt(getField(fields.totalChunks, 1), 10) || 1;
    const uploadId = getField(fields.uploadId, "");
    const filename = getField(fields.filename, "upload");

    if (!file || !uploadId) {
      return res
        .status(400)
        .send({ error: "Missing file or uploadId", data: fields });
    }

    console.log(
      `uploading chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}`,
    );

    const uploadDir = `runtime/files/.uploads/${uploadId}`;

    // Create upload directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const chunkPath = `${uploadDir}/${chunkIndex}`;

    fs.rename(file.filepath, chunkPath, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send(err);
      }

      // Check if all chunks are uploaded
      if (chunkIndex === totalChunks - 1) {
        // Assemble chunks
        let id = Math.floor(Math.random() * (999999 - 111111 + 1)) + 111111;
        let token = makeToken();

        const finalPath = `runtime/files/${id}`;
        const writeStream = fs.createWriteStream(finalPath);
        let chunkCount = 0;

        const assembleChunks = () => {
          if (chunkCount < totalChunks) {
            const chunk = fs.readFileSync(`${uploadDir}/${chunkCount}`);
            writeStream.write(chunk);
            chunkCount++;
            assembleChunks();
          } else {
            writeStream.end();
            writeStream.on("finish", () => {
              // Clean up upload directory
              fs.rm(uploadDir, { recursive: true }, () => {});

              db.serialize(() => {
                db.run(
                  `INSERT INTO files (id, filename, token, ttl) VALUES (?, ?, ?, ?)`,
                  [id, filename, token, 6],
                );
              });

              console.log("assigned id: " + id);
              res.send({ id, token, complete: true });
            });
          }
        };

        assembleChunks();
      } else {
        res.send({ uploadId, chunkIndex, complete: false });
      }
    });
  });
});

app.get("/*", (req, res) => {
  res.sendFile("dist/index.html", { root: "." });
});

app.listen(port, () => {
  console.log("listening on port " + port);
});

function cleanup() {
  // removing ttl from every row
  console.log("removing ttl");
  db.serialize(() => {
    db.run(`UPDATE files SET ttl = ttl - 1`);
  });

  // removing old files
  db.all("SELECT id FROM files WHERE ttl <= 0", function (err, rows) {
    if (err) {
      console.log(err.message);
      return;
    }

    rows.forEach(function (row) {
      console.log("no ttl left - removing " + row.id);

      fs.rm("runtime/files/" + row.id, () => {});

      // Delete id from table
      db.run(`DELETE FROM files WHERE id = ?`, row.id, function (err) {
        if (err) {
          console.log(err.message);
          return;
        }
      });
    });
  });
}

setInterval(cleanup, 10000);
