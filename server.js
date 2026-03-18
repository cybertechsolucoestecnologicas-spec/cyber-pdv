const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const session = require("express-session")
const SQLiteStore = require("connect-sqlite3")(session)

const app = express()

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

/* ================= SESSÃO ================= */
app.use(session({
    store: new SQLiteStore({ db: "sessions.db", dir: "./database" }),
    secret: "cyberpdv",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}))

/* ================= CONFIG ================= */
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static("public"))

/* ================= BANCO ================= */
const db = new sqlite3.Database("./database/pdv.db")

db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS usuarios(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        senha TEXT
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS produtos(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT,
        nome TEXT,
        preco REAL,
        quantidade INTEGER
    )`)

    db.run(`CREATE TABLE IF NOT EXISTS vendas(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        produto TEXT,
        quantidade INTEGER,
        total REAL,
        pagamento TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
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
    if (!req.session.user) return res.redirect("/login")
    next()
}

/* ================= ROTAS ================= */

app.get("/", (req, res) => res.redirect("/login"))

app.get("/login", (req, res) => res.render("login"))

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

app.get("/logout", (req, res) => {
    req.session.destroy()
    res.redirect("/login")
})

/* ================= DASHBOARD ================= */

app.get("/dashboard", auth, (req, res) => {

    db.get("SELECT COUNT(*) as total FROM produtos", (err, prod) => {
        db.get("SELECT SUM(total) as vendas FROM vendas", (err, vend) => {

            res.render("dashboard", {
                totalProdutos: prod?.total || 0,
                totalVendas: vend?.vendas || 0
            })

        })
    })

})

/* ================= PRODUTOS ================= */

app.get("/produtos", auth, (req, res) => res.render("produtos"))

app.post("/salvar-produto", (req, res) => {

    const { codigo, nome, preco, quantidade } = req.body

    db.run(
        "INSERT INTO produtos(codigo,nome,preco,quantidade) VALUES(?,?,?,?)",
        [codigo, nome, preco, quantidade],
        () => res.redirect("/lista-produtos")
    )
})

app.get("/lista-produtos", (req, res) => {

    db.all("SELECT * FROM produtos", [], (err, rows) => {
        res.render("lista", { produtos: rows })
    })

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

        db.get("SELECT SUM(total) as total FROM vendas WHERE data >= ?",
            [caixa.data_abertura],
            (err, vendas) => {

                const totalVendas = vendas?.total || 0
                const valorFinal = caixa.valor_inicial + totalVendas

                db.run(
                    "UPDATE caixa SET valor_final=?, data_fechamento=CURRENT_TIMESTAMP WHERE id=?",
                    [valorFinal, caixa.id],
                    () => {

                        res.send(`
                        <h2>Caixa fechado!</h2>
                        <p>Total vendido: R$ ${totalVendas.toFixed(2)}</p>
                        <p>Valor final: R$ ${valorFinal.toFixed(2)}</p>
                        <a href="/dashboard">Voltar</a>
                        `)

                    }
                )

            }
        )

    })

})

/* ================= VENDAS ================= */

app.get("/vendas", auth, (req, res) => res.render("vendas"))

app.post("/finalizar-venda", (req, res) => {

    const itens = JSON.parse(req.body.carrinho)
    let total = 0

    itens.forEach(item => {

        db.run(
            "INSERT INTO vendas(produto,quantidade,total,pagamento) VALUES(?,?,?,?)",
            [item.produto, item.quantidade, item.total, "Dinheiro"]
        )

        total += item.total
    })

    res.render("cupom", { itens, total })
})

/* ================= RELATORIO ================= */

app.get("/relatorio", auth, (req, res) => {

    db.all("SELECT * FROM vendas ORDER BY id DESC", [], (err, vendas) => {
        res.render("relatorio", { vendas })
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