require('dotenv').config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Sessão
app.use(
  session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
  })
);

// Banco de dados
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Middleware para proteger rotas
function auth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/");
  }
  next();
}

// LOGIN
app.get("/", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;

  db.query(
    "SELECT * FROM usuarios WHERE usuario=? AND senha=?",
    [usuario, senha],
    (err, results) => {
      if (results.length > 0) {
        req.session.user = results[0];
        return res.redirect("/dashboard");
      }
      res.send("Usuário ou senha inválidos");
    }
  );
});

// DASHBOARD
app.get("/dashboard", auth, (req, res) => {
  db.query("SELECT COUNT(*) AS totalProdutos FROM produtos", (err, produtos) => {
    db.query(
      "SELECT COUNT(*) AS vendasHoje, SUM(total) AS totalHoje FROM vendas WHERE DATE(data)=CURDATE()",
      (err, vendas) => {
        db.query(
          "SELECT nome, estoque FROM produtos WHERE estoque <= 5",
          (err, baixoEstoque) => {
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

// GRÁFICO 7 DIAS
app.get("/grafico-vendas", auth, (req, res) => {
  db.query(
    `
    SELECT DATE(data) AS dia, SUM(total) AS total
    FROM vendas
    GROUP BY DATE(data)
    ORDER BY dia DESC LIMIT 7
    `,
    (err, result) => {
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

// Render port
app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 Server rodando!")
);