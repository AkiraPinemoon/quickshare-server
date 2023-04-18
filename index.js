
const express = require('express');
const app = express();
const port = 80;

// for dev only
const cors = require('cors');
app.use(cors());

let filenames = {"123456" : "robot-icon.svg"};

app.use(express.static("../dist"));

app.get("/api/isValid/:fileId", (req, res) => {
    console.log("idcheck: " + req.params.fileId);
    // TODO: check with db if id is valid
    if(filenames[req.params.fileId]) res.send({file: true});
    else res.send({file: false});
});

app.get("/api/access/:fileId", (req, res) => {
    console.log("file requested: " + req.params.fileId);
    res.sendFile("files/" + filenames[req.params.fileId], { root: ".." });
})

app.get("/*", (req, res) => {
    res.sendFile("dist/index.html", { root: ".." });
});

app.listen(port, ()=>{
    console.log("listening on port " + port)
})
