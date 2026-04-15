const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

// ================= BANCO JSON =================
const DB_FILE = "db.json";

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        produtos: [],
        vendas: []
    }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ================= DASHBOARD =================
app.get("/", (req, res) => {
    const db = readDB();
    const total = db.vendas.reduce((soma, v) => soma + Number(v.total), 0);
    res.render("dashboard", { total });
});

// ================= PRODUTOS =================
app.get("/produtos", (req, res) => {
    const db = readDB();
    res.render("produtos", { produtos: db.produtos });
});

app.post("/produtos", (req, res) => {
    const db = readDB();

    db.produtos.push({
        id: Date.now(),
        nome: req.body.nome,
        preco: Number(req.body.preco)
    });

    writeDB(db);
    res.redirect("/produtos");
});

// ================= PDV =================
app.get("/pdv", (req, res) => {
    const db = readDB();
    res.render("pdv", { produtos: db.produtos });
});

app.post("/venda", (req, res) => {
    const db = readDB();

    const total = Number(req.body.total || 0);

    db.vendas.push({
        total,
        data: new Date()
    });

    writeDB(db);
    res.redirect("/");
});

// ================= RELATÓRIO =================
app.get("/relatorio", (req, res) => {
    const db = readDB();
    res.render("relatorio", { vendas: db.vendas });
});

// ================= OUTROS =================
app.get("/caixa", (req, res) => res.render("caixa"));
app.get("/login", (req, res) => res.render("login"));

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 PDV 100% FUNCIONANDO");
});