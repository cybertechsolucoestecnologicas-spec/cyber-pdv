const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessão (necessária para login)
app.use(
    session({
        secret: "cyberpdv123",
        resave: false,
        saveUninitialized: true,
    })
);

// Views (EJS)
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Rota inicial
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Login
app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    if (usuario === "admin" && senha === "123") {
        req.session.logado = true;
        return res.redirect("/dashboard");
    }

    res.send("Usuário ou senha inválidos.");
});

// Middleware de proteção
function auth(req, res, next) {
    if (!req.session.logado) return res.redirect("/login");
    next();
}

// Dashboard
app.get("/dashboard", auth, (req, res) => {
    res.render("dashboard", { caixa: true });
});

// Caixa
app.get("/caixa", auth, (req, res) => {
    res.render("caixa", { aberto: true, valorInicial: 100 });
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

// Arquivos estáticos (css, js, imagens)
app.use(express.static("public"));

// Porta Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});