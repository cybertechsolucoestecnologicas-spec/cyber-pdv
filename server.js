const express = require("express");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ROTAS

app.get("/", (req, res) => {
    res.render("dashboard");
});

app.get("/pdv", (req, res) => {
    res.render("pdv");
});

app.get("/produtos", (req, res) => {
    res.render("produtos");
});

app.get("/caixa", (req, res) => {
    res.render("caixa");
});

app.get("/login", (req, res) => {
    res.render("login");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 SISTEMA RODANDO");
});