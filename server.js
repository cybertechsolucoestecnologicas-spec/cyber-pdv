const express = require("express");
const path = require("path");
const mysql = require("mysql2");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

// ================= BANCO (POOL) =================
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// TESTE DE CONEXÃO
db.getConnection((err, conn) => {
    if (err) {
        console.error("❌ ERRO BANCO:", err);
    } else {
        console.log("✅ BANCO CONECTADO");
        conn.release();
    }
});

// ================= TABELAS =================
db.query(`
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255),
    preco DECIMAL(10,2)
)
`);

db.query(`
CREATE TABLE IF NOT EXISTS vendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total DECIMAL(10,2),
    data DATETIME
)
`);

// ================= DASHBOARD =================
app.get("/", (req, res) => {
    db.query("SELECT SUM(total) AS total FROM vendas", (err, result) => {
        if (err) return res.render("dashboard", { total: 0 });

        const total = result[0].total || 0;
        res.render("dashboard", { total });
    });
});

// ================= PRODUTOS =================
app.get("/produtos", (req, res) => {
    db.query("SELECT * FROM produtos", (err, produtos) => {
        if (err) return res.render("produtos", { produtos: [] });

        res.render("produtos", { produtos });
    });
});

app.post("/produtos", (req, res) => {
    const { nome, preco } = req.body;

    db.query(
        "INSERT INTO produtos (nome, preco) VALUES (?, ?)",
        [nome, Number(preco)],
        err => {
            if (err) console.error(err);
            res.redirect("/produtos");
        }
    );
});

// ================= PDV =================
app.get("/pdv", (req, res) => {
    db.query("SELECT * FROM produtos", (err, produtos) => {
        if (err) return res.render("pdv", { produtos: [] });

        res.render("pdv", { produtos });
    });
});

// 🔥 FINALIZAR VENDA (IMPORTANTE)
app.post("/venda", (req, res) => {
    const total = Number(req.body.total);

    if (!total || total <= 0) {
        return res.redirect("/pdv");
    }

    db.query(
        "INSERT INTO vendas (total, data) VALUES (?, NOW())",
        [total],
        err => {
            if (err) console.error("ERRO VENDA:", err);
            res.redirect("/");
        }
    );
});

// ================= RELATÓRIO =================
app.get("/relatorio", (req, res) => {
    db.query("SELECT * FROM vendas ORDER BY id DESC", (err, vendas) => {
        if (err) return res.render("relatorio", { vendas: [] });

        res.render("relatorio", { vendas });
    });
});

// ================= OUTROS =================
app.get("/caixa", (req, res) => res.render("caixa"));
app.get("/login", (req, res) => res.render("login"));

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 PDV ONLINE");
});