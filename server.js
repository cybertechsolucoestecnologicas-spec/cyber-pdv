require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(session({
    secret: "saas-secret",
    resave: false,
    saveUninitialized: true
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const db = mysql.createPool(process.env.MYSQL_URL);

// 🔥 TABELAS
db.query(`
CREATE TABLE IF NOT EXISTS empresas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255),
 status VARCHAR(50) DEFAULT 'ativa'
)`);

db.query(`
CREATE TABLE IF NOT EXISTS usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user VARCHAR(100),
 pass VARCHAR(100),
 empresa_id INT
)`);

db.query(`
CREATE TABLE IF NOT EXISTS produtos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255),
 preco DECIMAL(10,2),
 empresa_id INT
)`);

db.query(`
CREATE TABLE IF NOT EXISTS vendas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 total DECIMAL(10,2),
 empresa_id INT,
 data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

db.query(`
CREATE TABLE IF NOT EXISTS itens_venda (
 id INT AUTO_INCREMENT PRIMARY KEY,
 venda_id INT,
 nome VARCHAR(255),
 preco DECIMAL(10,2),
 qtd INT
)`);

// 🔥 USER PADRÃO
db.query(`INSERT IGNORE INTO empresas (id,nome) VALUES (1,'Empresa Demo')`);
db.query(`INSERT IGNORE INTO usuarios (id,user,pass,empresa_id) VALUES (1,'admin','1234',1)`);

// 🔒 AUTH
function auth(req,res,next){
    if(!req.session.user) return res.redirect("/login");
    next();
}

// 🔒 BLOQUEIO
function checkEmpresa(req,res,next){
    db.query(
        "SELECT status FROM empresas WHERE id=?",
        [req.session.empresa],
        (err,result)=>{
            if(result[0].status !== "ativa"){
                return res.send("⚠️ Pagamento pendente");
            }
            next();
        }
    );
}

// LOGIN
app.get("/login",(req,res)=>res.render("login"));

app.post("/login",(req,res)=>{
    const { user, pass } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE user=? AND pass=?",
        [user,pass],
        (err,result)=>{
            if(result.length>0){
                req.session.user = result[0];
                req.session.empresa = result[0].empresa_id;
                res.redirect("/pdv");
            } else {
                res.send("Login inválido");
            }
        }
    );
});

app.get("/logout",(req,res)=>{
    req.session.destroy();
    res.redirect("/login");
});

app.get("/",(req,res)=>res.redirect("/login"));

// PRODUTOS
app.get("/produtos",auth,checkEmpresa,(req,res)=>{
    db.query(
        "SELECT * FROM produtos WHERE empresa_id=?",
        [req.session.empresa],
        (err,produtos)=>{
            res.render("produtos",{produtos});
        }
    );
});

app.post("/produtos",auth,checkEmpresa,(req,res)=>{
    const { nome, preco } = req.body;

    db.query(
        "INSERT INTO produtos (nome,preco,empresa_id) VALUES (?,?,?)",
        [nome.toUpperCase(),preco,req.session.empresa],
        ()=>res.redirect("/produtos")
    );
});

// PDV
app.get("/pdv",auth,checkEmpresa,(req,res)=>res.render("pdv"));

// BUSCAR PRODUTO
app.post("/buscar-produto",auth,checkEmpresa,(req,res)=>{
    const nome = req.body.nome;

    db.query(
        "SELECT * FROM produtos WHERE nome=? AND empresa_id=?",
        [nome.toUpperCase(),req.session.empresa],
        (err,result)=>{
            if(result.length>0) res.json(result[0]);
            else res.json(null);
        }
    );
});

// FINALIZAR VENDA
app.post("/finalizar",auth,checkEmpresa,(req,res)=>{
    const { total, itens } = req.body;

    db.query(
        "INSERT INTO vendas (total,empresa_id) VALUES (?,?)",
        [total,req.session.empresa],
        (err,result)=>{

            const vendaId = result.insertId;

            itens.forEach(item=>{
                db.query(
                    "INSERT INTO itens_venda (venda_id,nome,preco,qtd) VALUES (?,?,?,?)",
                    [vendaId,item.nome,item.preco,item.qtd]
                );
            });

            res.json({ok:true});
        }
    );
});

// RELATORIO
app.get("/relatorio",auth,checkEmpresa,(req,res)=>{
    db.query(
        "SELECT * FROM vendas WHERE empresa_id=? ORDER BY id DESC",
        [req.session.empresa],
        (err,vendas)=>{
            res.render("relatorio",{vendas});
        }
    );
});

// 🔥 ADMIN
app.get("/admin",(req,res)=>{
    db.query("SELECT * FROM empresas",(err,empresas)=>{
        res.render("admin",{empresas});
    });
});

app.post("/admin/criar",(req,res)=>{
    const { nome,user,pass } = req.body;

    db.query(
        "INSERT INTO empresas (nome) VALUES (?)",
        [nome],
        (err,result)=>{

            const empresaId = result.insertId;

            db.query(
                "INSERT INTO usuarios (user,pass,empresa_id) VALUES (?,?,?)",
                [user,pass,empresaId],
                ()=>res.redirect("/admin")
            );
        }
    );
});

app.get("/admin/bloquear/:id",(req,res)=>{
    db.query(
        "UPDATE empresas SET status='bloqueada' WHERE id=?",
        [req.params.id],
        ()=>res.redirect("/admin")
    );
});

app.get("/admin/ativar/:id",(req,res)=>{
    db.query(
        "UPDATE empresas SET status='ativa' WHERE id=?",
        [req.params.id],
        ()=>res.redirect("/admin")
    );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("🚀 SaaS completo rodando"));