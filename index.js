
const express = require('express');
const app = express();
const port = 8000;

const sqlite3 = require('sqlite3').verbose();

db = new sqlite3.Database("../database.db");
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
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 64) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

// for dev only
// const cors = require('cors');
// app.use(cors());

app.use(express.static("../dist"));
app.use(express.json())

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

app.post("/api/delete/:fileId", (req, res) => {
    console.log("removing: " + req.params.fileId);

    db.get(`SELECT token FROM files WHERE id = ?`, [req.params.fileId], (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (row) {
            if(row.token != req.body.token) return res.status(500).send(err);
            db.serialize(() => {
                db.run(`DELETE FROM files WHERE id = ?`, [req.params.fileId]);
            })

            fs.rm("../files/" + req.params.fileId, () => {});
            res.sendStatus(200);
        }
    });
})

app.post("/api/keepup/:fileId", (req, res) => {
    console.log("keeping: " + req.params.fileId);

    db.get(`SELECT token FROM files WHERE id = ?`, [req.params.fileId], (err, row) => {
        if (err) {
            console.error(err.message);
        } else if (row) {
            if(row.token != req.body.token) return res.status(500).send(err);
            db.serialize(() => {
                db.run(`UPDATE files SET ttl = ? WHERE id = ?`, [6, req.params.fileId]);
            })
            res.sendStatus(200);
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
        let token = makeToken();
        // TODO: check if id is new

        fs.rename(file.filepath, "../files/" + id, (err) => {
            if (err) {
              console.error(err);
              return res.status(500).send(err);
            }
        });

        db.serialize(() => {
            db.run(`INSERT INTO files (id, filename, token, ttl) VALUES (?, ?, ?, ?)`, [id, file.originalFilename, token, 6]);
        });

        console.log("assigned id: " + id);
        res.send({id, token});
    });
})

app.get("/*", (req, res) => {
    res.sendFile("dist/index.html", { root: ".." });
});

app.listen(port, ()=>{
    console.log("listening on port " + port)
})

function cleanup() {
    // removing ttl from every row
    console.log("removing ttl")
    db.serialize(() => {
        db.run(`UPDATE files SET ttl = ttl - 1`);
    })

    // removing old files
    db.all("SELECT id FROM files WHERE ttl <= 0", function(err, rows) {
        if (err) {
            console.log(err.message);
            return;
        }
    
        rows.forEach(function(row) {
            console.log("no ttl left - removing " + row.id)
    
            fs.rm("../files/" + row.id, () => {});
    
            // Delete id from table
            db.run(`DELETE FROM files WHERE id = ?`, row.id, function(err) {
                if (err) {
                    console.log(err.message);
                    return;
                }
            });
        });
    });
}

setInterval(cleanup, 10000);
