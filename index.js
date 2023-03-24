
const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.static("../dist"));

app.get("/api/isValid/:fileId", (req, res) => {
    dbCheck.get((row)=>{console.log(row)})
});

app.get("/*", (req, res) => {
    res.sendFile("dist/index.html", { root: ".." });
});

app.listen(port, ()=>{
    console.log("listening on port " + port)
})
