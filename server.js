require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();

// CONFIG
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// CONEXÃO BANCO (USA MYSQL_URL)
const db = mysql.createConnection(process.env.MYSQL_URL);

db.connect(err => {
    if (err) {
        console.error("❌ ERRO BANCO:", err);
    } else {
        console.log("✅ BANCO CONECTADO");
    }
});

// 🔥 CRIAR TABELAS AUTOMATICAMENTE
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

// ROTAS

// HOME
app.get("/", (req, res) => {
    res.redirect("/pdv");
});

// PRODUTOS
app.get("/produtos", (req, res) => {
    db.query("SELECT * FROM produtos", (err, produtos) => {
        if (err) {
            console.log(err);
            return res.send("Erro ao buscar produtos");
        }
        res.render("produtos", { produtos });
    });
});

app.post("/produtos", (req, res) => {
    const { nome, preco } = req.body;

    if (!nome || !preco) {
        return res.send("Preencha todos os campos");
    }

    db.query(
        "INSERT INTO produtos (nome, preco) VALUES (?, ?)",
        [nome.toUpperCase(), preco],
        (err) => {
            if (err) {
                console.log(err);
                return res.send("Erro ao salvar produto");
            }
            res.redirect("/produtos");
        }
    );
});

// PDV
app.get("/pdv", (req, res) => {
    res.render("pdv");
});

// BUSCAR PRODUTO (PDV)
app.post("/buscar-produto", (req, res) => {
    const nome = req.body.nome;

    db.query(
        "SELECT * FROM produtos WHERE nome = ?",
        [nome.toUpperCase()],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.json(null);
            }

            if (result.length > 0) {
                res.json(result[0]);
            } else {
                res.json(null);
            }
        }
    );
});

// FINALIZAR VENDA
app.post("/finalizar", (req, res) => {
    const { total } = req.body;

    if (!total || total <= 0) {
        return res.send("Adicione produto antes de finalizar");
    }

    db.query(
        "INSERT INTO vendas (total) VALUES (?)",
        [total],
        (err) => {
            if (err) {
                console.log(err);
                return res.send("Erro ao finalizar venda");
            }

            res.send("Venda finalizada com sucesso");
        }
    );
});

// DASHBOARD SIMPLES
app.get("/dashboard", (req, res) => {
    db.query(
        "SELECT SUM(total) as total FROM vendas",
        (err, result) => {
            const total = result[0].total || 0;
            res.render("dashboard", { total });
        }
    );
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("🚀 SERVIDOR RODANDO NA PORTA " + PORT);
});