const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
    secret: "cyberpdv",
    resave: false,
    saveUninitialized: true
}));

// 🔥 CONEXÃO DIRETA (JÁ PRONTA COM SEU RAILWAY)
const db = mysql.createConnection({
    host: "monorail.proxy.rlwy.net",
    user: "root",
    password: "csZFJjDkwOFsojMotvxtVcNKhcDfGGjf",
    database: "railway",
    port: 41609
});

db.connect(err => {
    if (err) console.log("Erro banco:", err);
    else console.log("Banco conectado");
});

// LOGIN
app.get("/", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { user, pass } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE user=? AND pass=?",
        [user, pass],
        (err, result) => {

            if(result.length > 0){
                req.session.user = result[0];
                res.redirect("/pdv");
            } else {
                res.send("Login inválido");
            }

        }
    );
});

// PDV
app.get("/pdv", (req, res) => {
    res.render("pdv");
});

// FINALIZAR VENDA
app.post("/finalizar", (req, res) => {
    const { total } = req.body;

    db.query(
        "INSERT INTO vendas (total) VALUES (?)",
        [total],
        () => {
            res.send("ok");
        }
    );
});

// RELATÓRIO
app.get("/relatorio", (req, res) => {

    db.query("SELECT * FROM vendas", (err, result) => {

        if (err) {
            console.log(err);
            return res.send("Erro no banco");
        }

        res.render("relatorio", { vendas: result });

    });

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Rodando...");
});