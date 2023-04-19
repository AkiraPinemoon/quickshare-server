
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

app.get("/*", (req, res) => {
    res.sendFile("dist/index.html", { root: ".." });
});

app.listen(port, ()=>{
    console.log("listening on port " + port)
})
