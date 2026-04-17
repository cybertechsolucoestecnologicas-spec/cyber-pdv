const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const path = require("path");

const app = express();

// CONFIG
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));

app.use(session({
    secret: "cyberpdv",
    resave: false,
    saveUninitialized: true
}));

// CONEXÃO MYSQL (RAILWAY)
const db = mysql.createConnection({
    host: "monorail.proxy.rlwy.net",
    user: "root",
    password: "SUA_SENHA_AQUI",
    database: "railway",
    port: 41609
});

db.connect(err => {
    if (err) console.log("Erro banco:", err);
    else console.log("Banco conectado");
});

// MIDDLEWARE LOGIN
function auth(req, res, next){
    if(!req.session.user) return res.redirect("/");
    next();
}

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
app.get("/pdv", auth, (req, res) => {

    db.query("SELECT SUM(total) as total FROM vendas", (err, result) => {

        const totalHoje = result[0]?.total || 0;

        res.render("pdv", {
            user: req.session.user,
            totalHoje
        });

    });

});

// BUSCAR PRODUTO
app.post("/buscar-produto", auth, (req, res) => {

    const { nome } = req.body;

    db.query(
        "SELECT * FROM produtos WHERE nome LIKE ? LIMIT 1",
        [`%${nome}%`],
        (err, result) => {

            if(result.length > 0){
                res.json(result[0]);
            } else {
                res.json(null);
            }

        }
    );

});

// FINALIZAR VENDA
app.post("/finalizar", auth, (req, res) => {

    const { total } = req.body;

    if(!total) return res.send("Erro");

    db.query(
        "INSERT INTO vendas (total) VALUES (?)",
        [total],
        () => {
            res.send("ok");
        }
    );

});

// PRODUTOS
app.get("/produtos", auth, (req, res) => {

    db.query("SELECT * FROM produtos", (err, result) => {
        res.render("produtos", { produtos: result });
    });

});

app.post("/produtos", auth, (req, res) => {

    const { nome, preco } = req.body;

    db.query(
        "INSERT INTO produtos (nome, preco) VALUES (?,?)",
        [nome, preco],
        () => {
            res.redirect("/produtos");
        }
    );

});

// RELATÓRIO (CORRIGIDO)
app.get("/relatorio", auth, (req, res) => {

    db.query("SELECT * FROM vendas ORDER BY id DESC", (err, result) => {

        if(err){
            console.log(err);
            return res.send("Erro ao carregar relatório");
        }

        res.render("relatorio", {
            vendas: result || []
        });

    });

});

// LOGOUT
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Rodando na porta", PORT);
});