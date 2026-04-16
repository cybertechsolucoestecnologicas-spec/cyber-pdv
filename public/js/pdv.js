let produtos = [];
let total = 0;

const input = document.querySelector("input");
const totalEl = document.querySelector("#total");

input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        const nome = input.value.toLowerCase();

        fetch("/produtos")
            .then(res => res.text())
            .then(html => {
                if (html.includes(nome)) {
                    total += 5; // valor teste
                    totalEl.innerText = "R$ " + total;
                } else {
                    alert("Produto não encontrado");
                }
            });

        input.value = "";
    }
});

function finalizar() {
    if (total <= 0) {
        alert("Adicione produto antes de finalizar");
        return;
    }

    fetch("/venda", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "total=" + total
    }).then(() => {
        window.location.href = "/";
    });
}