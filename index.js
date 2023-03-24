
const express = require('express');
const app = express();
const port = 3000;

const sqlite = require('sqlite3')
const db = new sqlite.Database('db.sqlite');

db.serialize(() => {
    db.run("CREATE TABLE ids (id: TEXT, ttl: INT)");
})

const dbAdd = db.prepare("INSERT INTO ids VALUES (?, 60)");
const dbKeep = db.prepare("UPDATE ids SET ttl = 60 WHERE id = ?");
const dbRemove = db.prepare("DELETE FROM ids WHERE id = ?");
const dbCheck = db.prepare("SELECT COUNT(*) FROM ids WHERE id = ?");

app.get("/", (req, res) => {
    res.send("cat");
})

app.get("/api/isValid/:fileId", (req, res) => {
    dbCheck.get((row)=>{console.log(row)})
});

app.listen(port, ()=>{
    console.log("listening on port " + port)
})
