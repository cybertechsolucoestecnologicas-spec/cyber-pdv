require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");

const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cyberpdv',
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if (err) return console.log(err);

  console.log("✅ Banco conectado");

  db.query(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(50),
      nome VARCHAR(100),
      preco DECIMAL(10,2),
      estoque INT
    )
  `);
});

// 🛒 TELA PDV COMPLETA
app.get('/', (req, res) => {
  res.send(`
  <html>
  <head>
    <title>PDV</title>
    <style>
      body { font-family: Arial; background:#111; color:#fff; text-align:center; }
      input { padding:15px; font-size:20px; width:300px; }
      table { margin:auto; margin-top:20px; width:400px; }
      td { padding:10px; border-bottom:1px solid #333; }
      button { padding:10px 20px; margin:10px; font-size:16px; }
    </style>
  </head>
  <body>

    <h1>🛒 PDV</h1>

    <input id="codigo" placeholder="Código do produto" autofocus />

    <table id="lista"></table>

    <h2 id="total">Total: R$ 0.00</h2>

    <button onclick="finalizar()">Finalizar Venda</button>
    <button onclick="limpar()">Limpar</button>

    <audio id="bip" src="https://www.soundjay.com/buttons/sounds/beep-07.mp3"></audio>

    <script>
      let carrinho = {};
      let total = 0;

      const input = document.getElementById('codigo');
      const lista = document.getElementById('lista');
      const totalEl = document.getElementById('total');
      const bip = document.getElementById('bip');

      input.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const codigo = input.value;

          const res = await fetch('/produto/' + codigo);
          const produto = await res.json();

          if (produto.erro) {
            alert('Produto não encontrado');
            input.value = '';
            return;
          }

          bip.play();

          if (!carrinho[codigo]) {
            carrinho[codigo] = { ...produto, qtd: 0 };
          }

          carrinho[codigo].qtd++;

          render();
          input.value = '';
        }
      });

      function render() {
        lista.innerHTML = '';
        total = 0;

        Object.values(carrinho).forEach(p => {
          const subtotal = p.qtd * parseFloat(p.preco);
          total += subtotal;

          const row = document.createElement('tr');
          row.innerHTML = \`
            <td>\${p.nome}</td>
            <td>\${p.qtd}x</td>
            <td>R$ \${subtotal.toFixed(2)}</td>
          \`;

          lista.appendChild(row);
        });

        totalEl.innerText = 'Total: R$ ' + total.toFixed(2);
      }

      function limpar() {
        carrinho = {};
        render();
      }

      function finalizar() {
        alert('Venda finalizada! Total: R$ ' + total.toFixed(2));
        limpar();
      }
    </script>

  </body>
  </html>
  `);
});

// ➕ ADD PRODUTO
app.get('/add/:codigo/:nome/:preco/:estoque', (req, res) => {
  const { codigo, nome, preco, estoque } = req.params;

  db.query(
    "INSERT INTO produtos (codigo, nome, preco, estoque) VALUES (?, ?, ?, ?)",
    [codigo, nome, preco, estoque],
    () => res.send("OK")
  );
});

// 🔎 BUSCAR
app.get('/produto/:codigo', (req, res) => {
  db.query(
    "SELECT * FROM produtos WHERE codigo = ?",
    [req.params.codigo],
    (err, result) => {
      if (result.length === 0) {
        return res.json({ erro: "Produto não encontrado" });
      }
      res.json(result[0]);
    }
  );
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 PDV rodando na porta " + PORT);
});