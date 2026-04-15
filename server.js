require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: "pdv",
    resave: false,
    saveUninitialized: false
}));

// 🔥 CONEXÃO MYSQL (COM SSL + DEBUG)
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect(err => {
    if (err) {
        console.log("❌ ERRO REAL DO BANCO:");
        console.log(err);
    } else {
        console.log("✅ Banco conectado com sucesso");
    }
});

// 🔒 AUTH
function auth(req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    next();
}

// ================= LOGIN =================

app.get("/login", (req, res) => {
    res.send(`
    <h2>Login PDV</h2>
    <form method="POST">
        <input name="usuario" placeholder="Usuário"><br><br>
        <input name="senha" type="password" placeholder="Senha"><br><br>
        <button>Entrar</button>
    </form>
    `);
});

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE usuario=? AND senha=?",
        [usuario, senha],
        (err, result) => {

            if (err) {
                console.log("❌ ERRO LOGIN:", err);
                return res.send("Erro no banco");
            }

            if (result.length > 0) {
                req.session.user = result[0];
                req.session.empresa_id = result[0].empresa_id;
                res.redirect("/");
            } else {
                res.send("Login inválido");
            }
        }
    );
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// ================= DASHBOARD =================

app.get("/", auth, (req, res) => {
    res.send(`
    <h1>Dashboard</h1>
    <a href="/caixa">Caixa</a><br>
    <a href="/venda">PDV</a><br>
    <a href="/produtos">Produtos</a><br>
    <a href="/logout">Sair</a>
    `);
});

// ================= CAIXA =================

app.get("/caixa", auth, (req, res) => {

    db.query(
        "SELECT * FROM caixa WHERE empresa_id=? AND status='aberto' LIMIT 1",
        [req.session.empresa_id],
        (err, result) => {

            if (err) {
                console.log("❌ ERRO CAIXA:", err);
                return res.send("Erro no caixa");
            }

            if (!result || result.length === 0) {
                return res.send(`
                <h1>Abrir Caixa</h1>
                <form method="POST" action="/caixa/abrir">
                    <input name="valor" required>
                    <button>Abrir</button>
                </form>
                `);
            }

            res.send(`
                <h1>Caixa Aberto</h1>
                <p>Saldo: ${result[0].saldo_inicial}</p>
                <form method="POST" action="/caixa/fechar">
                    <button>Fechar Caixa</button>
                </form>
            `);
        }
    );
});

app.post("/caixa/abrir", auth, (req, res) => {
    db.query(
        "INSERT INTO caixa (empresa_id, saldo_inicial, status) VALUES (?, ?, 'aberto')",
        [req.session.empresa_id, req.body.valor],
        err => {
            if (err) {
                console.log(err);
                return res.send("Erro ao abrir");
            }
            res.redirect("/caixa");
        }
    );
});

app.post("/caixa/fechar", auth, (req, res) => {
    db.query(
        "UPDATE caixa SET status='fechado' WHERE empresa_id=? AND status='aberto'",
        [req.session.empresa_id],
        err => {
            if (err) return res.send("Erro ao fechar");
            res.redirect("/caixa");
        }
    );
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 Servidor rodando");
});