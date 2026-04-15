const express = require("express");
const path = require("path");
const db = require("./database/db");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

// ================= DASHBOARD =================
app.get("/", (req, res) => {
    db.all("SELECT SUM(total) as total FROM vendas", (err, rows) => {
        const total = rows[0].total || 0;
        res.render("dashboard", { total });
    });
});

// ================= PRODUTOS =================
app.get("/produtos", (req, res) => {
    db.all("SELECT * FROM produtos", (err, produtos) => {
        res.render("produtos", { produtos });
    });
});

app.post("/produtos", (req, res) => {
    const { nome, preco } = req.body;

    db.run(
        "INSERT INTO produtos (nome, preco) VALUES (?, ?)",
        [nome, preco],
        () => res.redirect("/produtos")
    );
});

// ================= PDV =================
app.get("/pdv", (req, res) => {
    db.all("SELECT * FROM produtos", (err, produtos) => {
        res.render("pdv", { produtos });
    });
});

app.post("/venda", (req, res) => {
    const total = req.body.total;

    db.run(
        "INSERT INTO vendas (total, data) VALUES (?, ?)",
        [total, new Date().toISOString()],
        () => res.redirect("/")
    );
});

// ================= RELATÓRIO =================
app.get("/relatorio", (req, res) => {
    db.all("SELECT * FROM vendas ORDER BY id DESC", (err, vendas) => {
        res.render("relatorio", { vendas });
    });
});

// ================= OUTROS =================
app.get("/caixa", (req, res) => res.render("caixa"));
app.get("/login", (req, res) => res.render("login"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 PDV COM BANCO REAL");
});