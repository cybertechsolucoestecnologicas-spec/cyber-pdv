const express = require("express");
const session = require("express-session");
const fs = require("fs");

const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "pdv",
    resave: false,
    saveUninitialized: false
}));

// 🔥 BANCO SIMPLES (JSON)
const DB_FILE = "db.json";

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        usuarios: [{ usuario: "admin", senha: "123" }],
        caixa: null
    }));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// LOGIN
app.get("/login", (req, res) => {
    res.send(`
    <h2>Login</h2>
    <form method="POST">
        <input name="usuario"><br><br>
        <input name="senha" type="password"><br><br>
        <button>Entrar</button>
    </form>
    `);
});

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;
    const db = readDB();

    const user = db.usuarios.find(u => u.usuario === usuario && u.senha === senha);

    if (user) {
        req.session.user = user;
        res.redirect("/");
    } else {
        res.send("Login inválido");
    }
});

// DASHBOARD
app.get("/", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    res.send(`
    <h1>Dashboard</h1>
    <a href="/caixa">Caixa</a><br><br>
    <a href="/logout">Sair</a>
    `);
});

// CAIXA
app.get("/caixa", (req, res) => {
    if (!req.session.user) return res.redirect("/login");

    const db = readDB();

    if (!db.caixa) {
        return res.send(`
        <h1>Abrir Caixa</h1>
        <form method="POST" action="/caixa/abrir">
            <input name="valor">
            <button>Abrir</button>
        </form>
        `);
    }

    res.send(`
        <h1>Caixa Aberto</h1>
        <p>Saldo: ${db.caixa}</p>
        <form method="POST" action="/caixa/fechar">
            <button>Fechar</button>
        </form>
    `);
});

app.post("/caixa/abrir", (req, res) => {
    const db = readDB();
    db.caixa = req.body.valor;
    writeDB(db);
    res.redirect("/caixa");
});

app.post("/caixa/fechar", (req, res) => {
    const db = readDB();
    db.caixa = null;
    writeDB(db);
    res.redirect("/caixa");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Sistema rodando");
});