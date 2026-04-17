const express = require("express");
const path = require("path");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: "pdv-secret",
    resave: false,
    saveUninitialized: true
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🔥 USUÁRIO FIXO (ADMIN)
const usuario = {
    user: "admin",
    pass: "1234"
};

// DADOS
let produtos = [];
let vendas = [];
let caixaAberto = false;

// 🔒 MIDDLEWARE LOGIN
function auth(req, res, next) {
    if (!req.session.logado) {
        return res.redirect("/login");
    }
    next();
}

// LOGIN
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { user, pass } = req.body;

    if (user === usuario.user && pass === usuario.pass) {
        req.session.logado = true;
        return res.redirect("/dashboard");
    }

    res.send("Login inválido");
});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// DASHBOARD
app.get("/dashboard", auth, (req, res) => {
    let total = vendas.reduce((s, v) => s + v.total, 0);
    res.render("dashboard", { total });
});

// PRODUTOS
app.get("/produtos", auth, (req, res) => {
    res.render("produtos", { produtos });
});

app.post("/produtos", auth, (req, res) => {
    const { nome, preco } = req.body;

    produtos.push({
        nome: nome.trim(),
        preco: parseFloat(preco)
    });

    res.redirect("/produtos");
});

// CAIXA
app.get("/caixa/abrir", auth, (req, res) => {
    caixaAberto = true;
    vendas = [];
    res.redirect("/pdv");
});

app.get("/caixa/fechar", auth, (req, res) => {
    let total = vendas.reduce((s, v) => s + v.total, 0);
    caixaAberto = false;

    res.send(`<h1>Total do Dia: R$ ${total.toFixed(2)}</h1>`);
});

// PDV
app.get("/pdv", auth, (req, res) => {
    res.render("pdv", { produtos });
});

// FINALIZAR
app.post("/finalizar", auth, (req, res) => {
    const total = parseFloat(req.body.total);

    if (!caixaAberto) return res.send("Abra o caixa");

    vendas.push({ total });

    res.redirect("/dashboard");
});

// RELATÓRIO
app.get("/relatorio", auth, (req, res) => {
    res.render("relatorio", { vendas });
});

app.get("/", (req, res) => {
    res.redirect("/login");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("🚀 SaaS rodando");
});