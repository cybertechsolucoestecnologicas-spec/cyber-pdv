const express = require("express");
const path = require("path");
const mysql = require("mysql2");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, conn) => {
    if (err) console.error("ERRO BANCO:", err);
    else {
        console.log("BANCO OK");
        conn.release();
    }
});

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

app.get("/", (req, res) => {
    db.query("SELECT SUM(total) AS total FROM vendas", (err, result) => {
        const total = result[0]?.total || 0;
        res.render("dashboard", { total });
    });
});

app.get("/produtos", (req, res) => {
    db.query("SELECT * FROM produtos", (err, produtos) => {
        res.render("produtos", { produtos });
    });
});

app.post("/produtos", (req, res) => {
    const { nome, preco } = req.body;

    db.query(
        "INSERT INTO produtos (nome, preco) VALUES (?, ?)",
        [nome, preco],
        () => res.redirect("/produtos")
    );
});

app.get("/pdv", (req, res) => {
    db.query("SELECT * FROM produtos", (err, produtos) => {
        res.render("pdv", { produtos });
    });
});

app.post("/venda", (req, res) => {
    const total = Number(req.body.total);

    if (total > 0) {
        db.query(
            "INSERT INTO vendas (total, data) VALUES (?, NOW())",
            [total],
            () => res.redirect("/")
        );
    } else {
        res.redirect("/pdv");
    }
});

app.get("/relatorio", (req, res) => {
    db.query("SELECT * FROM vendas ORDER BY id DESC", (err, vendas) => {
        res.render("relatorio", { vendas });
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("PDV ONLINE");
});