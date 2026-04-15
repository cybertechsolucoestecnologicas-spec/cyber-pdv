console.log("✅ PDV JS CARREGADO");

let carrinho = [];
let total = 0;

const input = document.getElementById("codigo");

// 🔥 GARANTE QUE O INPUT EXISTE
if (!input) {
    alert("ERRO: input #codigo não encontrado");
}

// ENTER
input.addEventListener("keydown", function(e) {

    if (e.key === "Enter") {

        let codigo = input.value.trim();

        console.log("🔎 Código digitado:", codigo);

        if (!codigo) return;

        fetch("/produto/" + codigo)
        .then(res => res.json())
        .then(prod => {

            console.log("📦 Produto recebido:", prod);

            if (!prod) {
                alert("Produto não encontrado");
                return;
            }

            // 🔥 CORREÇÃO PRINCIPAL
            prod.preco = parseFloat(prod.preco);

            let item = carrinho.find(i => i.id === prod.id);

            if (item) {
                item.qtd++;
            } else {
                carrinho.push({
                    id: prod.id,
                    nome: prod.nome,
                    preco: prod.preco,
                    qtd: 1
                });
            }

            render();
        })
        .catch(err => {
            console.log("❌ ERRO FETCH:", err);
        });

        input.value = "";
    }
});

// RENDER
function render() {

    let lista = document.getElementById("lista");

    if (!lista) {
        alert("ERRO: tabela #lista não encontrada");
        return;
    }

    lista.innerHTML = "";
    total = 0;

    carrinho.forEach(p => {

        let sub = p.qtd * p.preco;
        total += sub;

        lista.innerHTML += `
        <tr>
            <td>${p.nome}</td>
            <td>${p.qtd}</td>
            <td>R$ ${p.preco.toFixed(2)}</td>
            <td>R$ ${sub.toFixed(2)}</td>
        </tr>`;
    });

    let totalEl = document.getElementById("total");

    if (totalEl) {
        totalEl.innerText = "R$ " + total.toFixed(2);
    }
}

// MODAL
function abrirPagamento() {
    if (carrinho.length === 0) {
        alert("Carrinho vazio");
        return;
    }
    document.getElementById("modalPagamento").style.display = "block";
}

function fecharPagamento() {
    document.getElementById("modalPagamento").style.display = "none";
}

// PAGAMENTO
function pagar(tipo) {

    console.log("💰 Finalizando venda...");

    fetch("/venda", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ itens: carrinho, total, tipo })
    })
    .then(res => res.json())
    .then(data => {

        console.log("🧾 Venda salva:", data);

        if (!data || !data.id) {
            alert("Erro ao finalizar venda");
            return;
        }

        window.open("/cupom/" + data.id, "_blank");

        carrinho = [];
        render();
        fecharPagamento();
    })
    .catch(err => {
        console.log("❌ ERRO VENDA:", err);
    });
}

// F2
document.addEventListener("keydown", function(e) {
    if (e.key === "F2") {
        e.preventDefault();
        abrirPagamento();
    }
});