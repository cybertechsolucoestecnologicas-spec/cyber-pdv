const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
    secret: "pdv",
    resave: false,
    saveUninitialized: false
}));

// ===== DB JSON =====
const DB_FILE = "db.json";

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        usuarios: [{ usuario: "admin", senha: "123" }],
        produtos: [],
        caixa: null,
        vendas: []
    }, null, 2));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (d) => fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 2));

// ===== AUTH =====
const auth = (req, res, next) => {
    if (!req.session.user) return res.redirect("/login");
    next();
};

// ===== LOGIN =====
app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;
    const db = readDB();

    const user = db.usuarios.find(u => u.usuario === usuario && u.senha === senha);

    if (!user) return res.send("Login inválido");

    req.session.user = user;
    res.redirect("/");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// ===== DASHBOARD =====
app.get("/", auth, (req, res) => {
    const db = readDB();
    const totalHoje = db.vendas.reduce((s, v) => s + v.total, 0);

    res.render("dashboard", {
        totalHoje,
        caixa: db.caixa
    });
});

// ===== PRODUTOS =====
app.get("/produtos", auth, (req, res) => {
    const db = readDB();
    res.render("produtos", { produtos: db.produtos });
});

app.post("/produtos", auth, (req, res) => {
    const db = readDB();

    db.produtos.push({
        id: Date.now(),
        nome: req.body.nome,
        preco: Number(req.body.preco)
    });

    writeDB(db);
    res.redirect("/produtos");
});

// ===== CAIXA =====
app.get("/caixa", auth, (req, res) => {
    const db = readDB();
    res.render("caixa", { caixa: db.caixa });
});

app.post("/caixa/abrir", auth, (req, res) => {
    const db = readDB();
    db.caixa = Number(req.body.valor);
    writeDB(db);
    res.redirect("/caixa");
});

app.post("/caixa/fechar", auth, (req, res) => {
    const db = readDB();
    db.caixa = null;
    writeDB(db);
    res.redirect("/caixa");
});

// ===== PDV =====
app.get("/pdv", auth, (req, res) => {
    const db = readDB();
    res.render("pdv", { produtos: db.produtos });
});

app.post("/finalizar", auth, (req, res) => {
    const db = readDB();

    db.vendas.push({
        total: Number(req.body.total),
        data: new Date()
    });

    writeDB(db);
    res.redirect("/relatorio");
});

// ===== RELATÓRIO =====
app.get("/relatorio", auth, (req, res) => {
    const db = readDB();
    res.render("relatorio", { vendas: db.vendas });
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 PDV rodando"));