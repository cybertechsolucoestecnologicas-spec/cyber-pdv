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

const db = new sqlite3.Database("./database/pdv.db")

/* ================= BANCO ================= */

db.serialize(()=>{

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

/* ================= LOGIN ================= */

function verificarLogin(req,res,next){
    if(!req.session.usuario){
        return res.redirect("/login")
    }
    next()
}

app.get("/",(req,res)=>{
    res.render("login",{layout:false})
})

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

app.get("/logout",(req,res)=>{
    req.session.destroy()
    res.redirect("/login")
})

/* ================= DASHBOARD ================= */

app.get("/dashboard", verificarLogin, (req,res)=>{

db.get("SELECT COUNT(*) as total FROM produtos",(err,prod)=>{
db.get("SELECT SUM(total) as vendas FROM vendas",(err,vend)=>{
db.all("SELECT * FROM produtos WHERE quantidade<=5",[],(err,estoque)=>{
db.all(`SELECT strftime('%m',data) as mes, SUM(total) as total FROM vendas GROUP BY mes`,[],(err,grafico)=>{

res.render("dashboard",{
    totalProdutos: prod?.total || 0,
    totalVendas: vend?.vendas || 0,
    estoqueBaixo: estoque || [],
    grafico: grafico || []
})

})})})})

})

/* ================= CAIXA ================= */

app.get("/caixa", verificarLogin, (req,res)=>{
db.get("SELECT * FROM caixa WHERE data_fechamento IS NULL ORDER BY id DESC",(err,caixa)=>{
res.render("caixa",{caixa})
})
})

app.post("/abrir-caixa",(req,res)=>{
const valor = parseFloat(req.body.valor) || 0
db.run("INSERT INTO caixa(valor_inicial) VALUES(?)",[valor],()=> res.redirect("/caixa"))
})

app.post("/fechar-caixa",(req,res)=>{

db.get("SELECT * FROM caixa WHERE data_fechamento IS NULL ORDER BY id DESC",(err,caixa)=>{

if(!caixa) return res.redirect("/caixa")

db.get("SELECT SUM(total) as total FROM vendas WHERE data >= ?",[caixa.data_abertura],(err,vendas)=>{

const totalVendas = vendas?.total ? parseFloat(vendas.total) : 0
const valorInicial = caixa.valor_inicial ? parseFloat(caixa.valor_inicial) : 0

const valorFinal = valorInicial + totalVendas

db.run("UPDATE caixa SET valor_final=?, data_fechamento=CURRENT_TIMESTAMP WHERE id=?",
[valorFinal, caixa.id],
()=>{

res.send(`
<h2>Caixa fechado!</h2>
<p>Total vendido: R$ ${totalVendas.toFixed(2)}</p>
<p>Valor final: R$ ${valorFinal.toFixed(2)}</p>
<a href="/dashboard">Voltar</a>
`)

})

})

})

})

/* ================= VENDAS ================= */

app.get("/vendas", verificarLogin, (req,res)=>{

db.get("SELECT * FROM caixa WHERE data_fechamento IS NULL",(err,caixa)=>{
if(!caixa) return res.send("⚠️ Abra o caixa primeiro!")
res.render("vendas")
})

})

app.post("/finalizar-venda",(req,res)=>{

const itens = JSON.parse(req.body.carrinho)
const pagamento = req.body.pagamento

let totalVenda = 0

itens.forEach(item=>{
db.run("INSERT INTO vendas(produto,quantidade,total,pagamento) VALUES(?,?,?,?)",
[item.produto,item.quantidade,item.total,pagamento])

db.run("UPDATE produtos SET quantidade = quantidade - ? WHERE nome=?",
[item.quantidade,item.produto])

totalVenda += item.total
})

res.render("cupom",{itens,total:totalVenda,pagamento})

})

/* ================= PRODUTOS ================= */

app.get("/produtos", verificarLogin, (req,res)=> res.render("produtos"))

app.post("/salvar-produto",(req,res)=>{
const {codigo,nome,preco,quantidade}=req.body
db.run("INSERT INTO produtos(codigo,nome,preco,quantidade) VALUES(?,?,?,?)",
[codigo,nome,preco,quantidade],
()=> res.redirect("/lista-produtos"))
})

app.get("/lista-produtos",(req,res)=>{
db.all("SELECT * FROM produtos",[],(err,rows)=>{
res.render("lista",{produtos:rows})
})
})

app.get("/editar/:id",(req,res)=>{
db.get("SELECT * FROM produtos WHERE id=?",[req.params.id],(err,produto)=>{
res.render("editar",{produto})
})
})

app.post("/atualizar/:id",(req,res)=>{
const {codigo,nome,preco,quantidade}=req.body
db.run("UPDATE produtos SET codigo=?,nome=?,preco=?,quantidade=? WHERE id=?",
[codigo,nome,preco,quantidade,req.params.id],
()=> res.redirect("/lista-produtos"))
})

app.get("/deletar/:id",(req,res)=>{
db.run("DELETE FROM produtos WHERE id=?",[req.params.id],
()=> res.redirect("/lista-produtos"))
})

app.get("/buscar-produto/:codigo",(req,res)=>{
db.get("SELECT * FROM produtos WHERE codigo=?",[req.params.codigo],
(err,produto)=> res.json(produto))
})

/* ================= RELATORIO ================= */

app.get("/relatorio", verificarLogin, (req,res)=>{

db.get(`SELECT SUM(total) as hoje FROM vendas WHERE date(data)=date('now')`,(err,hoje)=>{
db.get(`SELECT SUM(total) as mes FROM vendas WHERE strftime('%m',data)=strftime('%m','now')`,(err,mes)=>{
db.get(`SELECT COUNT(*) as total FROM vendas`,(err,total)=>{
db.get(`SELECT produto FROM vendas GROUP BY produto ORDER BY COUNT(*) DESC LIMIT 1`,(err,top)=>{
db.all("SELECT * FROM vendas ORDER BY id DESC",[],(err,vendas)=>{

res.render("relatorio",{
vendas: vendas || [],
hoje: hoje?.hoje || 0,
mes: mes?.mes || 0,
total: total?.total || 0,
top: top || {produto:"Nenhum"}
})

})
})
})
})
})

})

/* ================= PORTA RENDER ================= */

const PORT = process.env.PORT || 3000

app.listen(PORT, ()=>{
console.log("🚀 Rodando na porta " + PORT)
})