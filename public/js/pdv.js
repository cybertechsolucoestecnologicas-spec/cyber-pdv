let total = 0;

function addProduto(nome, preco) {
    total += preco;

    document.getElementById("total").innerText = total;

    let li = document.createElement("li");
    li.innerText = nome + " - R$ " + preco;

    document.getElementById("lista").appendChild(li);

    document.getElementById("bip").play();
}