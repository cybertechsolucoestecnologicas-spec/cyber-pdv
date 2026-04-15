require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("trust proxy", 1);

app.use(session({
    secret: "pdv",
    resave: false,
    saveUninitialized: false
}));

// 🔥 MYSQL
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306
});

db.connect(err => {
    if (err) console.log("ERRO DB:", err);
    else console.log("Banco conectado");
});

// 🔒 AUTH
function auth(req, res, next) {
    if (!req.session.user) return res.redirect("/login");
    next();
}

// ================= LOGIN =================

app.get("/login", (req, res) => {
    res.send(`
    <h2>Login PDV</h2>
    <form method="POST">
        <input name="usuario"><br><br>
        <input name="senha" type="password"><br><br>
        <button>Entrar</button>
    </form>
    `);
});

app.post("/login", (req, res) => {
    const { usuario, senha } = req.body;

    db.query(
        "SELECT * FROM usuarios WHERE usuario=? AND senha=?",
        [usuario, senha],
        (err, result) => {
            if (result.length > 0) {
                req.session.user = result[0];
                req.session.empresa_id = result[0].empresa_id;
                res.redirect("/");
            } else {
                res.send("Login inválido");
            }
        }
    );
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

// ================= DASHBOARD =================

app.get("/", auth, (req, res) => {

    db.query(
        "SELECT SUM(total) as total FROM vendas WHERE empresa_id=?",
        [req.session.empresa_id],
        (e1, r1) => {

            db.query(
                "SELECT COUNT(*) as vendas FROM vendas WHERE empresa_id=?",
                [req.session.empresa_id],
                (e2, r2) => {

                    db.query(
                        "SELECT COUNT(*) as produtos FROM produtos WHERE empresa_id=?",
                        [req.session.empresa_id],
                        (e3, r3) => {

                            res.send(`
                            <body style="background:#0f172a;color:white;padding:20px">
                                <h1>📊 DASHBOARD</h1>

                                <p>Total: R$ ${r1[0].total || 0}</p>
                                <p>Vendas: ${r2[0].vendas}</p>
                                <p>Produtos: ${r3[0].produtos}</p>

                                <a href="/caixa">💰 Caixa</a><br><br>
                                <a href="/venda">🛒 PDV</a><br><br>
                                <a href="/produtos">📦 Produtos</a><br><br>
                                <a href="/relatorio">📊 Relatório</a><br><br>
                                <a href="/logout">🚪 Sair</a>
                            </body>
                            `);
                        }
                    );
                }
            );
        }
    );
});

// ================= PRODUTOS =================

app.get("/produtos", auth, (req, res) => {
    db.query(
        "SELECT * FROM produtos WHERE empresa_id=?",
        [req.session.empresa_id],
        (err, produtos) => {

            let lista = produtos.map(p =>
                `<div>${p.nome} | ${p.codigo} | R$ ${p.preco} | Estoque: ${p.estoque}</div>`
            ).join("");

            res.send(`
            <body style="background:#0f172a;color:white;padding:20px">
            <h1>Produtos</h1>

            <form method="POST" action="/produtos/add">
                <input name="nome" placeholder="Nome"><br><br>
                <input name="codigo" placeholder="Código"><br><br>
                <input name="preco" placeholder="Preço"><br><br>
                <input name="estoque" placeholder="Estoque"><br><br>
                <button>Cadastrar</button>
            </form>

            ${lista}

            <br><a href="/">Voltar</a>
            </body>
            `);
        }
    );
});

app.post("/produtos/add", auth, (req, res) => {
    const { nome, codigo, preco, estoque } = req.body;

    db.query(
        "INSERT INTO produtos (nome, codigo, preco, estoque, empresa_id) VALUES (?, ?, ?, ?, ?)",
        [nome, codigo, preco, estoque, req.session.empresa_id],
        () => res.redirect("/produtos")
    );
});

// ================= CAIXA (CORRIGIDO) =================

app.get("/caixa", auth, (req, res) => {

    const empresa = req.session.empresa_id;

    db.query(
        "SELECT * FROM caixa WHERE empresa_id=? AND status='aberto' LIMIT 1",
        [empresa],
        (err, result) => {

            if (err) {
                console.log("ERRO CAIXA:", err);
                return res.send("Erro no banco (caixa)");
            }

            if (!result || result.length === 0) {
                return res.send(`
                <h1>💰 Abrir Caixa</h1>
                <form method="POST" action="/caixa/abrir">
                    <input name="valor" required placeholder="Saldo inicial">
                    <button>Abrir Caixa</button>
                </form>
                <br><a href="/">Voltar</a>
                `);
            }

            res.send(`
                <h1>💰 Caixa Aberto</h1>
                <p>Saldo inicial: R$ ${result[0].saldo_inicial}</p>

                <form method="POST" action="/caixa/fechar">
                    <button>Fechar Caixa</button>
                </form>

                <br><a href="/venda">Ir para Venda</a>
                <br><a href="/">Voltar</a>
            `);
        }
    );
});

app.post("/caixa/abrir", auth, (req, res) => {

    const empresa = req.session.empresa_id;
    const valor = req.body.valor;

    db.query(
        "INSERT INTO caixa (empresa_id, saldo_inicial, status) VALUES (?, ?, 'aberto')",
        [empresa, valor],
        (err) => {
            if (err) {
                console.log("ERRO ABRIR:", err);
                return res.send("Erro ao abrir caixa");
            }

            res.redirect("/caixa");
        }
    );
});

app.post("/caixa/fechar", auth, (req, res) => {

    const empresa = req.session.empresa_id;

    db.query(
        "SELECT SUM(total) as total FROM vendas WHERE empresa_id=?",
        [empresa],
        (err, vendas) => {

            if (err) {
                console.log("ERRO SOMA:", err);
                return res.send("Erro ao calcular vendas");
            }

            const total = vendas[0].total || 0;

            db.query(
                "UPDATE caixa SET saldo_final=?, status='fechado', data_fechamento=NOW() WHERE empresa_id=? AND status='aberto'",
                [total, empresa],
                (err) => {

                    if (err) {
                        console.log("ERRO FECHAR:", err);
                        return res.send("Erro ao fechar caixa");
                    }

                    res.redirect("/caixa");
                }
            );
        }
    );
});

// ================= PDV =================

app.get("/venda", auth, (req, res) => {
    res.send(`
    <h1>PDV</h1>
    <input id="codigo" autofocus>
    <div id="lista"></div>
    <h2>Total: <span id="total">0</span></h2>
    <button onclick="finalizar()">Finalizar</button>

    <script>
    let carrinho = [];
    let total = 0;

    document.getElementById("codigo").addEventListener("keypress", async e=>{
        if(e.key==="Enter"){
            let res = await fetch("/api/produtos/"+e.target.value);
            let p = await res.json();

            if(p.erro) return alert("Produto não encontrado");

            carrinho.push(p);
            total += parseFloat(p.preco);

            document.getElementById("lista").innerHTML += p.nome+"<br>";
            document.getElementById("total").innerText = total.toFixed(2);

            e.target.value="";
        }
    });

    async function finalizar(){
        await fetch("/api/venda",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({itens:carrinho,total})
        });
        alert("Venda feita");
        location.reload();
    }
    </script>
    `);
});

// ================= API =================

app.get("/api/produtos/:codigo", auth, (req, res) => {
    db.query(
        "SELECT * FROM produtos WHERE codigo=? AND empresa_id=?",
        [req.params.codigo, req.session.empresa_id],
        (err, result) => {
            if (result.length === 0) return res.json({ erro: true });
            res.json(result[0]);
        }
    );
});

app.post("/api/venda", auth, (req, res) => {
    const { itens, total } = req.body;

    db.query(
        "INSERT INTO vendas (total, empresa_id) VALUES (?, ?)",
        [total, req.session.empresa_id],
        (err, venda) => {

            const id = venda.insertId;

            itens.forEach(i=>{
                db.query(
                    "INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco) VALUES (?, ?, 1, ?)",
                    [id, i.id, i.preco]
                );

                db.query(
                    "UPDATE produtos SET estoque = estoque - 1 WHERE id=?",
                    [i.id]
                );
            });

            res.json({ok:true});
        }
    );
});

// ================= RELATORIO =================

app.get("/relatorio", auth, (req, res) => {
    db.query(
        "SELECT * FROM vendas WHERE empresa_id=? ORDER BY id DESC",
        [req.session.empresa_id],
        (err, vendas) => {

            let html = "<h1>Relatório</h1>";

            vendas.forEach(v=>{
                html += `<div>Venda ${v.id} - R$ ${v.total}</div>`;
            });

            res.send(html);
        }
    );
});

// ================= START =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Servidor rodando...");
});