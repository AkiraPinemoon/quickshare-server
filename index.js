
const express = require('express');
const path = require('path');
const app = express();
const port = 80;

app.use(express.static("../dist"));

app.get("/api/isValid/:fileId", (req, res) => {
    // TODO: check with db if id is valid
    if(req.params.fileId == "123456") res.write("true");
    else res.write("false");
    res.end();
});

app.get("/*", (req, res) => {
    res.sendFile("dist/index.html", { root: ".." });
});

app.listen(port, ()=>{
    console.log("listening on port " + port)
})
