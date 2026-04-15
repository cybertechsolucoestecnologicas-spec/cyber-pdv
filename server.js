const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "pdv",
    resave: false,
    saveUninitialized: false
}));

// BANCO LOCAL (SEM ERRO)
const db = new sqlite3.Database("./pdv.db");

// CRIA TABELAS
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, usuario TEXT, senha TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS caixa (id INTEGER PRIMARY KEY, saldo REAL, status TEXT)");

    db.run("INSERT INTO usuarios (usuario, senha) SELECT 'admin','123' WHERE NOT EXISTS (SELECT 1 FROM usuarios)");
});

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

    db.get("SELECT * FROM usuarios WHERE usuario=? AND senha=?", [usuario, senha], (err, user) => {
        if (user) {
            req.session.user = user;
            res.redirect("/");
        } else {
            res.send("Login inválido");
        }
    });
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

    db.get("SELECT * FROM caixa WHERE status='aberto'", (err, caixa) => {

        if (!caixa) {
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
        <p>Saldo: ${caixa.saldo}</p>
        <form method="POST" action="/caixa/fechar">
            <button>Fechar</button>
        </form>
        `);
    });
});

app.post("/caixa/abrir", (req, res) => {
    db.run("INSERT INTO caixa (saldo, status) VALUES (?, 'aberto')", [req.body.valor], () => {
        res.redirect("/caixa");
    });
});

app.post("/caixa/fechar", (req, res) => {
    db.run("UPDATE caixa SET status='fechado'", () => {
        res.redirect("/caixa");
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Rodando...");
});