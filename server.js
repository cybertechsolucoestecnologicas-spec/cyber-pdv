require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();

// CONFIGURAÇÕES
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// SESSÃO
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// BANCO DE DADOS
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "cyber_pdv",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Testar conexão
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ ERRO AO CONECTAR AO MYSQL:", err);
  } else {
    console.log("✅ MySQL conectado");
    conn.release();
  }
});

// MIDDLEWARE PARA PROTEGER ROTAS
function auth(req, res, next) {
  if (!req.session.user) return res.redirect("/");
  next();
}

// LOGIN
app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;

  db.query(
    "SELECT * FROM usuarios WHERE usuario=? AND senha=? LIMIT 1",
    [usuario, senha],
    (err, results) => {
      if (err) return res.send("Erro no servidor: " + err);

      if (results.length > 0) {
        req.session.user = results[0];
        return res.redirect("/dashboard");
      }
      res.send("Usuário ou senha inválidos");
    }
  );
});

// DASHBOARD COMPLETO
app.get("/dashboard", auth, (req, res) => {
  db.query("SELECT COUNT(*) AS totalProdutos FROM produtos", (err, produtos) => {
    if (err) return res.send("Erro: " + err);

    db.query(
      "SELECT COUNT(*) AS vendasHoje, SUM(total) AS totalHoje FROM vendas WHERE DATE(data)=CURDATE()",
      (err, vendas) => {
        if (err) return res.send("Erro: " + err);

        db.query(
          "SELECT nome, estoque FROM produtos WHERE estoque <= 5",
          (err, baixoEstoque) => {
            if (err) return res.send("Erro: " + err);

            res.render("dashboard", {
              user: req.session.user,
              totalProdutos: produtos[0].totalProdutos,
              vendasHoje: vendas[0].vendasHoje || 0,
              totalHoje: vendas[0].totalHoje || 0,
              baixoEstoque,
            });
          }
        );
      }
    );
  });
});

// API – GRÁFICO 7 DIAS
app.get("/grafico-vendas", auth, (req, res) => {
  db.query(
    `
      SELECT DATE(data) AS dia, SUM(total) AS total
      FROM vendas
      GROUP BY DATE(data)
      ORDER BY dia DESC LIMIT 7
    `,
    (err, result) => {
      if (err) return res.json({ erro: true, message: err });
      res.json(result.reverse());
    }
  );
});

// CAIXA
app.get("/caixa", auth, (req, res) => {
  res.render("caixa");
});

// LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// SERVIDOR
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Servidor rodando na porta " + (process.env.PORT || 3000));
});