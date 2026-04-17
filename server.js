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
    if (err) console.log(err);
    else console.log("✅ BANCO OK");
});

// 🔥 TABELAS
db.query(`
CREATE TABLE IF NOT EXISTS usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user VARCHAR(100),
 pass VARCHAR(100)
)`);

db.query(`
CREATE TABLE IF NOT EXISTS produtos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255),
 preco DECIMAL(10,2)
)`);

db.query(`
CREATE TABLE IF NOT EXISTS vendas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 total DECIMAL(10,2),
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

// 🔥 CRIAR USUÁRIO PADRÃO
db.query(`
INSERT IGNORE INTO usuarios (id, user, pass)
VALUES (1, 'admin', '1234')
`);

// 🔐 LOGIN
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
                res.redirect("/pdv");
            } else {
                res.send("Login inválido");
            }
        }
    );
});

// 🔁 HOME REDIRECIONA PRA LOGIN
app.get("/", (req, res) => {
    res.redirect("/login");
});

// PRODUTOS
app.get("/produtos", (req, res) => {
    db.query("SELECT * FROM produtos", (err, produtos) => {
        res.render("produtos", { produtos });
    });
});

app.post("/produtos", (req, res) => {
    const { nome, preco } = req.body;
    db.query(
        "INSERT INTO produtos (nome, preco) VALUES (?, ?)",
        [nome.toUpperCase(), preco],
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
        "SELECT * FROM produtos WHERE nome = ?",
        [nome.toUpperCase()],
        (err, result) => {
            if (result.length > 0) res.json(result[0]);
            else res.json(null);
        }
    );
});

// FINALIZAR VENDA
app.post("/finalizar", (req, res) => {
    const { total, itens } = req.body;

    db.query("INSERT INTO vendas (total) VALUES (?)", [total], (err, result) => {
        const vendaId = result.insertId;

        itens.forEach(item => {
            db.query(
                "INSERT INTO itens_venda (venda_id, nome, preco, qtd) VALUES (?, ?, ?, ?)",
                [vendaId, item.nome, item.preco, item.qtd]
            );
        });

        res.send("Venda salva");
    });
});

// RELATORIO
app.get("/relatorio", (req, res) => {
    db.query("SELECT * FROM vendas ORDER BY id DESC", (err, vendas) => {
        res.render("relatorio", { vendas });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 RODANDO"));