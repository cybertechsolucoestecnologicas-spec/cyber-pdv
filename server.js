const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "pdv",
    resave: false,
    saveUninitialized: false
}));

// 🔥 BANCO SQLITE (SEM ERRO)
const db = new sqlite3.Database("./pdv.db");

// CRIA TABELAS AUTOMATICO
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        senha TEXT,
        empresa_id INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS caixa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER,
        saldo_inicial REAL,
        status TEXT
    )`);

    // cria usuário padrão
    db.run(`INSERT INTO usuarios (usuario, senha, empresa_id)
        SELECT 'admin', '123', 1
        WHERE NOT EXISTS (SELECT 1 FROM usuarios)`);
});

// AUTH
function auth(req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    next();
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

    db.get(
        "SELECT * FROM usuarios WHERE usuario=? AND senha=?",
        [usuario, senha],
        (err, user) => {

            if (err) return res.send("Erro no banco");

            if (user) {
                req.session.user = user;
                req.session.empresa_id = user.empresa_id;
                res.redirect("/");
            } else {
                res.send("Login inválido");
            }
        }
    );
});

// DASHBOARD
app.get("/", auth, (req, res) => {
    res.send(`
    <h1>Dashboard</h1>
    <a href="/caixa">Caixa</a><br><br>
    <a href="/logout">Sair</a>
    `);
});

// CAIXA
app.get("/caixa", auth, (req, res) => {

    db.get(
        "SELECT * FROM caixa WHERE status='aberto' AND empresa_id=?",
        [req.session.empresa_id],
        (err, caixa) => {

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
                <p>Saldo: ${caixa.saldo_inicial}</p>

                <form method="POST" action="/caixa/fechar">
                    <button>Fechar</button>
                </form>
            `);
        }
    );
});

app.post("/caixa/abrir", auth, (req, res) => {
    db.run(
        "INSERT INTO caixa (empresa_id, saldo_inicial, status) VALUES (?, ?, 'aberto')",
        [req.session.empresa_id, req.body.valor],
        () => res.redirect("/caixa")
    );
});

app.post("/caixa/fechar", auth, (req, res) => {
    db.run(
        "UPDATE caixa SET status='fechado' WHERE empresa_id=?",
        [req.session.empresa_id],
        () => res.redirect("/caixa")
    );
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// START
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Rodando");
});