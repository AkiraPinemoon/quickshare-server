
const express = require('express');
const app = express();
const port = 80;

const sqlite3 = require('sqlite3').verbose();

db = new sqlite3.Database("../database.db");
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        filename TEXT UNIQUE
    )`);
});

// for dev only
const cors = require('cors');
app.use(cors());

app.use(express.static("../dist"));

app.get("/api/isValid/:fileId", (req, res) => {
    console.log("idcheck: " + req.params.fileId);

    db.get(`SELECT id FROM files WHERE id = ?`, [req.params.fileId], (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (row) {
            res.send({file: true});
        } else {
            res.send({file: false});
        }
    });
});

app.get("/api/access/:fileId", (req, res) => {
    console.log("file requested: " + req.params.fileId);

    res.sendFile("files/" + req.params.fileId, { root: ".." });
})

app.get("/api/filename/:fileId", (req, res) => {
    console.log("filename: " + req.params.fileId);

    db.get(`SELECT filename FROM files WHERE id = ?`, [req.params.fileId], (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (row) {
            res.send(row);
        }
    });
})

const formidable = require("formidable");
const fs = require("fs");

app.post("/api/upload", async (req, res) => {
    const form = formidable({
        multiples: false,
        uploadDir: "../temp",
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }

        const file = files.file;
        console.log("uploading: " + file.originalFilename);
        
        let id = Math.floor(Math.random() * (999999 - 111111 + 1)) + 111111

        fs.rename(file.filepath, "../files/" + id, (err) => {
            if (err) {
              console.error(err);
              return res.status(500).send(err);
            }
        });

        db.serialize(() => {
            db.run(`
            INSERT INTO files (id, filename) VALUES (?, ?)`, [id, file.originalFilename]);
        });

        console.log("assigned id: " + id);
        res.send({id});
    });
})

app.get("/*", (req, res) => {
    res.sendFile("dist/index.html", { root: ".." });
});

app.listen(port, ()=>{
    console.log("listening on port " + port)
})
