const express = require("express");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🔥 BANCO FAKE (FUNCIONA SEM MYSQL)
let produtos = [];
let vendas = [];

// DASHBOARD
app.get("/dashboard", (req, res) => {
    let total = vendas.reduce((soma, v) => soma + v.total, 0);
    res.render("dashboard", { total });
});

// PRODUTOS
app.get("/produtos", (req, res) => {
    res.render("produtos", { produtos });
});

app.post("/produtos", (req, res) => {
    const { nome, preco } = req.body;
    produtos.push({ nome, preco: parseFloat(preco) });
    res.redirect("/produtos");
});

// PDV
app.get("/pdv", (req, res) => {
    res.render("pdv", { produtos });
});

// FINALIZAR
app.post("/finalizar", (req, res) => {
    const { total } = req.body;

    if (!total || total == 0) {
        return res.send("Venda inválida");
    }

    vendas.push({ total: parseFloat(total) });

    res.redirect("/dashboard");
});

// RELATÓRIO
app.get("/relatorio", (req, res) => {
    res.render("relatorio", { vendas });
});

app.get("/", (req, res) => {
    res.redirect("/dashboard");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 SISTEMA FUNCIONANDO SEM BANCO");
});