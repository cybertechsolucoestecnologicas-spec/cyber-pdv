const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const session = require("express-session")

const app = express()

/* ================= CONFIG ================= */

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

app.use(express.static("public"))

/* ================= SESSION ================= */

app.use(session({
    secret: "cyberpdv",
    resave: false,
    saveUninitialized: false
}))

/* ================= DATABASE ================= */

const db = new sqlite3.Database("./database/pdv.db")

db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        senha TEXT
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS caixa(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        valor_inicial REAL,
        valor_final REAL,
        data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_fechamento DATETIME
    )`)

    db.run(`
        INSERT INTO usuarios(usuario,senha)
        SELECT 'admin','1234'
        WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario='admin')
    `)
})

/* ================= MIDDLEWARE ================= */

function auth(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/login")
    }
    next()
}

/* ================= ROTAS ================= */

app.get("/", (req, res) => {
    res.redirect("/login")
})

/* LOGIN */

app.get("/login", (req, res) => {
    res.render("login")
})

app.post("/login", (req, res) => {

    const { usuario, senha } = req.body

    db.get("SELECT * FROM usuarios WHERE usuario=? AND senha=?",
        [usuario, senha],
        (err, user) => {

            if (!user) return res.send("Login inválido")

            req.session.user = user.usuario
            res.redirect("/dashboard")
        })
})

/* DASHBOARD */

app.get("/dashboard", auth, (req, res) => {
    res.render("dashboard")
})

/* ================= CAIXA ================= */

app.get("/caixa", auth, (req, res) => {

    db.get("SELECT * FROM caixa WHERE data_fechamento IS NULL", (err, caixa) => {
        res.render("caixa", { caixa })
    })

})

app.post("/abrir-caixa", (req, res) => {

    const valor = parseFloat(req.body.valor) || 0

    db.run("INSERT INTO caixa(valor_inicial) VALUES(?)",
        [valor],
        () => res.redirect("/caixa")
    )
})

app.post("/fechar-caixa", (req, res) => {

    db.get("SELECT * FROM caixa WHERE data_fechamento IS NULL", (err, caixa) => {

        if (!caixa) return res.redirect("/caixa")

        const valorFinal = caixa.valor_inicial

        db.run(
            "UPDATE caixa SET valor_final=?, data_fechamento=CURRENT_TIMESTAMP WHERE id=?",
            [valorFinal, caixa.id],
            () => {

                res.send(`
                <h2>Caixa fechado!</h2>
                <p>Valor final: R$ ${valorFinal.toFixed(2)}</p>
                <a href="/dashboard">Voltar</a>
                `)

            }
        )
    })
})

/* ================= TESTE ================= */

app.get("/teste", (req, res) => {
    res.send("OK ONLINE 🚀")
})

/* ================= SERVER ================= */

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log("🚀 Rodando na porta " + PORT)
})