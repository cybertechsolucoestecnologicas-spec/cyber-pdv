console.log("ALTERAÇÃO TESTE 123");
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

// PLANOS
const planos = {
    basico: { limiteProdutos: 50, valor: 29 },
    pro: { limiteProdutos: 999, valor: 49 },
    premium: { limiteProdutos: 9999, valor: 79 }
};

// TABELAS
db.query(`CREATE TABLE IF NOT EXISTS empresas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255),
 status VARCHAR(50) DEFAULT 'ativa',
 plano VARCHAR(50) DEFAULT 'basico',
 vencimento DATE
)`);

db.query(`CREATE TABLE IF NOT EXISTS usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 user VARCHAR(100),
 pass VARCHAR(100),
 empresa_id INT
)`);

db.query(`CREATE TABLE IF NOT EXISTS produtos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255),
 preco DECIMAL(10,2),
 empresa_id INT
)`);

db.query(`CREATE TABLE IF NOT EXISTS vendas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 total DECIMAL(10,2),
 empresa_id INT,
 data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

db.query(`CREATE TABLE IF NOT EXISTS itens_venda (
 id INT AUTO_INCREMENT PRIMARY KEY,
 venda_id INT,
 nome VARCHAR(255),
 preco DECIMAL(10,2),
 qtd INT
)`);

// DADOS PADRÃO
db.query(`INSERT IGNORE INTO empresas (id,nome,vencimento) VALUES (1,'Empresa Demo',DATE_ADD(CURDATE(),INTERVAL 30 DAY))`);
db.query(`INSERT IGNORE INTO usuarios (id,user,pass,empresa_id) VALUES (1,'admin','1234',1)`);

// MIDDLEWARE
function auth(req,res,next){
    if(!req.session.user) return res.redirect("/login");
    next();
}

function checkEmpresa(req,res,next){
    db.query("SELECT * FROM empresas WHERE id=?",[req.session.empresa],(err,result)=>{
        const emp = result[0];
        const hoje = new Date();
        const venc = new Date(emp.vencimento);

        if(emp.status !== "ativa" || hoje > venc){
            return res.redirect("/planos");
        }

        next();
    });
}

// LOGIN
app.get("/login",(req,res)=>res.render("login"));

app.post("/login",(req,res)=>{
    const { user, pass } = req.body;

    db.query("SELECT * FROM usuarios WHERE user=? AND pass=?",[user,pass],(err,result)=>{
        if(result.length){
            req.session.user = result[0];
            req.session.empresa = result[0].empresa_id;
            res.redirect("/pdv");
        } else {
            res.send("Login inválido");
        }
    });
});

app.get("/logout",(req,res)=>{
    req.session.destroy();
    res.redirect("/login");
});

// PDV
app.get("/pdv", auth, checkEmpresa, (req,res)=>{
    db.query(
        "SELECT IFNULL(SUM(total),0) as total FROM vendas WHERE empresa_id=? AND DATE(data)=CURDATE()",
        [req.session.empresa],
        (err,result)=>{
            res.render("pdv", {
                totalHoje: result[0].total,
                user: req.session.user
            });
        }
    );
});

// PRODUTOS
app.get("/produtos", auth, checkEmpresa, (req,res)=>{
    db.query("SELECT * FROM produtos WHERE empresa_id=?",[req.session.empresa],(err,produtos)=>{
        res.render("produtos",{produtos});
    });
});

app.post("/produtos", auth, checkEmpresa, (req,res)=>{
    const { nome, preco } = req.body;

    db.query(
        "INSERT INTO produtos (nome,preco,empresa_id) VALUES (?,?,?)",
        [nome.toUpperCase(),preco,req.session.empresa],
        ()=>res.redirect("/produtos")
    );
});

// BUSCAR PRODUTO
app.post("/buscar-produto", auth, checkEmpresa, (req,res)=>{
    db.query(
        "SELECT * FROM produtos WHERE nome=? AND empresa_id=?",
        [req.body.nome.toUpperCase(),req.session.empresa],
        (err,r)=>res.json(r[0] || null)
    );
});

// FINALIZAR VENDA
app.post("/finalizar", auth, checkEmpresa, (req,res)=>{
    const { total, itens } = req.body;

    db.query(
        "INSERT INTO vendas (total,empresa_id) VALUES (?,?)",
        [total,req.session.empresa],
        (err,result)=>{

            const vendaId = result.insertId;

            itens.forEach(i=>{
                db.query(
                    "INSERT INTO itens_venda (venda_id,nome,preco,qtd) VALUES (?,?,?,?)",
                    [vendaId,i.nome,i.preco,i.qtd]
                );
            });

            res.json({ok:true});
        }
    );
});

// RELATORIO
app.get("/relatorio", auth, checkEmpresa, (req,res)=>{
    db.query("SELECT * FROM vendas WHERE empresa_id=?",[req.session.empresa],(err,vendas)=>{
        res.render("relatorio",{vendas});
    });
});

// PLANOS (CORRIGIDO)
app.get("/planos", auth, (req,res)=>{
    res.render("planos",{planos});
});

// PAGAMENTO PIX
app.get("/pagar/:plano", auth, (req,res)=>{
    const plano = req.params.plano;
    res.render("pagar",{ plano, valor: planos[plano].valor });
});

// ADMIN
app.get("/admin",(req,res)=>{
    db.query("SELECT * FROM empresas",(err,empresas)=>{
        res.render("admin",{empresas});
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("🔥 SISTEMA RODANDO"));