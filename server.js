require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const path = require("path");
const mercadopago = require("mercadopago");

const app = express();

// 🔥 CONFIG
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

// 🔥 BANCO
const db = mysql.createPool(process.env.MYSQL_URL);

// 🔥 MERCADO PAGO
mercadopago.configure({
    access_token: process.env.MP_TOKEN
});

// 🔥 PLANOS
const planos = {
    basico: { limiteProdutos: 50, valor: 29 },
    pro: { limiteProdutos: 9999, valor: 49 },
    premium: { limiteProdutos: 9999, valor: 79 }
};

// 🔥 TABELAS
db.query(`
CREATE TABLE IF NOT EXISTS empresas (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(255),
 status VARCHAR(50) DEFAULT 'ativa',
 plano VARCHAR(50) DEFAULT 'basico',
 vencimento DATE
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

// 🔥 DADOS INICIAIS
db.query(`INSERT IGNORE INTO empresas (id,nome,vencimento) VALUES (1,'Empresa Demo',DATE_ADD(CURDATE(),INTERVAL 30 DAY))`);
db.query(`INSERT IGNORE INTO usuarios (id,user,pass,empresa_id) VALUES (1,'admin','1234',1)`);

// 🔒 AUTH
function auth(req,res,next){
    if(!req.session.user) return res.redirect("/login");
    next();
}

// 🔒 CHECK PLANO
function checkEmpresa(req,res,next){
    db.query(
        "SELECT * FROM empresas WHERE id=?",
        [req.session.empresa],
        (err,result)=>{

            const emp = result[0];
            const hoje = new Date();
            const venc = new Date(emp.vencimento);

            if(emp.status !== "ativa" || hoje > venc){
                return res.send(`
                    <h2>Plano vencido</h2>
                    <p>Plano: ${emp.plano}</p>
                    <a href="/planos"><button>Escolher Plano</button></a>
                `);
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

// PRODUTOS COM LIMITE
app.get("/produtos",auth,checkEmpresa,(req,res)=>{
    db.query(
        "SELECT * FROM produtos WHERE empresa_id=?",
        [req.session.empresa],
        (err,produtos)=>res.render("produtos",{produtos})
    );
});

app.post("/produtos",auth,checkEmpresa,(req,res)=>{
    const { nome, preco } = req.body;

    db.query(
        "SELECT COUNT(*) as total FROM produtos WHERE empresa_id=?",
        [req.session.empresa],
        (err,r)=>{

            db.query(
                "SELECT plano FROM empresas WHERE id=?",
                [req.session.empresa],
                (err,p)=>{

                    const plano = p[0].plano;

                    if(r[0].total >= planos[plano].limiteProdutos){
                        return res.send("Limite do plano atingido");
                    }

                    db.query(
                        "INSERT INTO produtos (nome,preco,empresa_id) VALUES (?,?,?)",
                        [nome.toUpperCase(),preco,req.session.empresa],
                        ()=>res.redirect("/produtos")
                    );
                }
            );
        }
    );
});

// PDV
app.get("/pdv",auth,checkEmpresa,(req,res)=>res.render("pdv"));

// BUSCAR PRODUTO
app.post("/buscar-produto",auth,checkEmpresa,(req,res)=>{
    db.query(
        "SELECT * FROM produtos WHERE nome=? AND empresa_id=?",
        [req.body.nome.toUpperCase(),req.session.empresa],
        (err,r)=>res.json(r[0] || null)
    );
});

// FINALIZAR
app.post("/finalizar",auth,checkEmpresa,(req,res)=>{
    const { total, itens } = req.body;

    db.query(
        "INSERT INTO vendas (total,empresa_id) VALUES (?,?)",
        [total,req.session.empresa],
        (err,result)=>{

            const id = result.insertId;

            itens.forEach(i=>{
                db.query(
                    "INSERT INTO itens_venda (venda_id,nome,preco,qtd) VALUES (?,?,?,?)",
                    [id,i.nome,i.preco,i.qtd]
                );
            });

            res.json({ok:true});
        }
    );
});

// RELATORIO
app.get("/relatorio",auth,checkEmpresa,(req,res)=>{
    db.query(
        "SELECT * FROM vendas WHERE empresa_id=?",
        [req.session.empresa],
        (err,vendas)=>res.render("relatorio",{vendas})
    );
});

// 🔥 TELA PLANOS
app.get("/planos",auth,(req,res)=>{
    res.render("planos",{planos});
});

// 🔥 PAGAMENTO PIX
app.get("/pagar/:plano",auth,(req,res)=>{

    const plano = req.params.plano;
    const valor = planos[plano].valor;

    mercadopago.payment.create({
        transaction_amount: valor,
        description: "Plano " + plano,
        payment_method_id: "pix",
        payer:{ email:"cliente@email.com" }
    }).then(resp=>{

        const qr = resp.body.point_of_interaction.transaction_data.qr_code_base64;

        res.send(`
            <h2>Pague o plano ${plano}</h2>
            <img src="data:image/png;base64,${qr}">
        `);
    });
});

// 🔥 WEBHOOK
app.post("/webhook",(req,res)=>{

    if(req.body.type==="payment"){
        const id = req.body.data.id;

        mercadopago.payment.findById(id)
        .then(resp=>{

            if(resp.body.status==="approved"){

                const venc = new Date();
                venc.setDate(venc.getDate()+30);

                db.query(
                    "UPDATE empresas SET status='ativa', vencimento=? WHERE id=?",
                    [venc, req.session.empresa]
                );
            }
        });
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log("🚀 SISTEMA COMPLETO"));