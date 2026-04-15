const express = require("express");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// TESTE SIMPLES
app.get("/", (req, res) => {
    res.send("🔥 SERVIDOR ONLINE FUNCIONANDO");
});

app.get("/teste", (req, res) => {
    res.send("OK TESTE");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 SERVER OK");
});