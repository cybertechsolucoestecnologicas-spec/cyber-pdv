require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const db = mysql.createConnection(process.env.MYSQL_URL);

db.connect(err => {
    if (err) console.log("ERRO:", err);
    else console.log("✅ BANCO OK");
});

// 🔥 TABELAS SAAS
db.query(`
CREATE TABLE IF NOT EXISTS empresas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255)
)`);

db.query(`
CREATE TABLE IF NOT EXISTS usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user VARCHAR(100),
 pass VARCHAR(100),
 empresa_id INT
)`);

db.query(`
CREATE TABLE IF NOT EXISTS produtos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255),
 preco DECIMAL(10,2),
 empresa_id INT
)`);

db.query(`
CREATE TABLE IF NOT EXISTS vendas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 total DECIMAL(10,2),
 empresa_id INT,
 data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

db.query(`
CREATE TABLE IF NOT EXISTS itens_venda (
 id INT AUTO_INCREMENT PRIMARY KEY,
 venda_id INT,
 nome VARCHAR(255),
 preco DECIMAL(10,2),
 qtd INT
)`);

// 🔥 CRIA EMPRESA + USUARIO PADRÃO
db.query(`INSERT IGNORE INTO empresas (id, nome) VALUES (1, 'Empresa Teste')`);

db.query(`
INSERT IGNORE INTO usuarios (id, user, pass, empresa_id)
VALUES (1, 'admin', '1234', 1)
`);

// 🔐 CONTROLE SIMPLES (GLOBAL)
let empresaAtual = null;

// LOGIN
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { user, pass } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE user=? AND pass=?",
        [user, pass],
        (err, result) => {
            if (result.length > 0) {
                empresaAtual = result[0].empresa_id;
                res.redirect("/pdv");
            } else {
                res.send("Login inválido");
            }
        }
    );
});

// HOME
app.get("/", (req, res) => res.redirect("/login"));

// PRODUTOS
app.get("/produtos", (req, res) => {
    db.query(
        "SELECT * FROM produtos WHERE empresa_id=?",
        [empresaAtual],
        (err, produtos) => {
            res.render("produtos", { produtos });
        }
    );
});

app.post("/produtos", (req, res) => {
    const { nome, preco } = req.body;

    db.query(
        "INSERT INTO produtos (nome, preco, empresa_id) VALUES (?, ?, ?)",
        [nome.toUpperCase(), preco, empresaAtual],
        () => res.redirect("/produtos")
    );
});

// PDV
app.get("/pdv", (req, res) => {
    res.render("pdv");
});

// BUSCAR PRODUTO
app.post("/buscar-produto", (req, res) => {
    const nome = req.body.nome;

    db.query(
        "SELECT * FROM produtos WHERE nome=? AND empresa_id=?",
        [nome.toUpperCase(), empresaAtual],
        (err, result) => {
            if (result.length > 0) res.json(result[0]);
            else res.json(null);
        }
    );
});

// FINALIZAR VENDA
app.post("/finalizar", (req, res) => {
    const { total, itens } = req.body;

    db.query(
        "INSERT INTO vendas (total, empresa_id) VALUES (?, ?)",
        [total, empresaAtual],
        (err, result) => {

            const vendaId = result.insertId;

            itens.forEach(item => {
                db.query(
                    "INSERT INTO itens_venda (venda_id, nome, preco, qtd) VALUES (?, ?, ?, ?)",
                    [vendaId, item.nome, item.preco, item.qtd]
                );
            });

            res.send("Venda salva");
        }
    );
});

// RELATORIO
app.get("/relatorio", (req, res) => {
    db.query(
        "SELECT * FROM vendas WHERE empresa_id=? ORDER BY id DESC",
        [empresaAtual],
        (err, vendas) => {
            res.render("relatorio", { vendas });
        }
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 SaaS rodando"));