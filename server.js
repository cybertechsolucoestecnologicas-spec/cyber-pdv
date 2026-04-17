const express = require("express");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🔥 DADOS (TEMPORÁRIO)
let produtos = [];
let vendas = [];
let caixaAberto = false;

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

    produtos.push({
        nome: nome.trim(),
        preco: parseFloat(preco)
    });

    res.redirect("/produtos");
});

// 🔥 ABRIR CAIXA
app.get("/caixa/abrir", (req, res) => {
    caixaAberto = true;
    vendas = [];
    res.redirect("/pdv");
});

// 🔥 FECHAR CAIXA
app.get("/caixa/fechar", (req, res) => {
    let total = vendas.reduce((s, v) => s + v.total, 0);

    caixaAberto = false;

    res.send(`
        <h2>Caixa Fechado</h2>
        <h1>Total do Dia: R$ ${total.toFixed(2)}</h1>
        <a href="/caixa/abrir">Abrir novamente</a>
    `);
});

// PDV
app.get("/pdv", (req, res) => {
    res.render("pdv", { produtos });
});

// FINALIZAR VENDA
app.post("/finalizar", (req, res) => {
    const total = parseFloat(req.body.total);

    if (!caixaAberto) {
        return res.send("Abra o caixa primeiro");
    }

    if (!total || total <= 0) {
        return res.send("Adicione produto antes de finalizar");
    }

    vendas.push({ total });

    res.redirect("/dashboard");
});

// RELATÓRIO
app.get("/relatorio", (req, res) => {
    res.render("relatorio", { vendas });
});

app.get("/", (req, res) => {
    res.redirect("/dashboard");
});

// PORTA
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 SISTEMA VENDÁVEL RODANDO");
});