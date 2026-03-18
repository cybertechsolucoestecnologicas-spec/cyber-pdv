const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const session = require("express-session")
const expressLayouts = require("express-ejs-layouts")

const app = express()

app.use(express.urlencoded({extended:true}))
app.use(express.json())

app.use(session({
    secret: "pdv",
    resave: false,
    saveUninitialized: true
}))

/* LAYOUT */
app.use(expressLayouts)
app.set("layout", "layout")

app.set("view engine","ejs")
app.set("views",path.join(__dirname,"views"))

app.use(express.static("public"))

/* BANCO */
const db = new sqlite3.Database("./database/pdv.db")

db.serialize(()=>{

db.run(`CREATE TABLE IF NOT EXISTS usuarios(
id INTEGER PRIMARY KEY AUTOINCREMENT,
usuario TEXT,
senha TEXT
)`)

db.run(`
INSERT INTO usuarios(usuario,senha)
SELECT 'admin','1234'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario='admin')
`)

})

/* ================= TESTE ONLINE ================= */
app.get("/teste",(req,res)=>{
    res.send("OK ONLINE 🚀")
})

/* ================= HOME ================= */
app.get("/",(req,res)=>{
    res.render("login",{layout:false})
})

/* ================= LOGIN ================= */

app.get("/login",(req,res)=> res.render("login",{layout:false}))

app.post("/login",(req,res)=>{
    const {usuario,senha} = req.body

    db.get("SELECT * FROM usuarios WHERE usuario=? AND senha=?",
    [usuario,senha],
    (err,user)=>{
        if(!user) return res.send("Login inválido")

        req.session.usuario = user.usuario
        res.redirect("/dashboard")
    })
})

/* ================= DASHBOARD ================= */

app.get("/dashboard",(req,res)=>{
    res.send("Dashboard funcionando 🚀")
})

/* ================= PORTA RENDER ================= */

const PORT = process.env.PORT || 3000

app.listen(PORT, ()=>{
console.log("🚀 Rodando na porta " + PORT)
})