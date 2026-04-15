const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

// BANCO JSON
const DB = "db.json";

if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify({ produtos: [], vendas: [] }));
}

function readDB(){
    return JSON.parse(fs.readFileSync(DB));
}

function writeDB(data){
    fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ROTAS

app.get("/", (req, res) => res.render("dashboard"));

// PRODUTOS
app.get("/produtos", (req, res) => {
    const db = readDB();
    res.render("produtos", { produtos: db.produtos });
});

app.post("/produtos", (req, res) => {
    const db = readDB();

    db.produtos.push({
        nome: req.body.nome,
        preco: Number(req.body.preco)
    });

    writeDB(db);
    res.redirect("/produtos");
});

// PDV
app.get("/pdv", (req, res) => {
    const db = readDB();
    res.render("pdv", { produtos: db.produtos });
});

app.post("/venda", (req, res) => {
    const db = readDB();

    db.vendas.push({
        total: Number(req.body.total),
        data: new Date()
    });

    writeDB(db);
    res.redirect("/");
});

// OUTROS
app.get("/caixa", (req, res) => res.render("caixa"));
app.get("/login", (req, res) => res.render("login"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("🚀 PDV REAL"));