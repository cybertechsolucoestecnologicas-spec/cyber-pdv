const express = require("express");
const router = express.Router();

// rota produtos
router.get("/produtos", (req, res) => {
    res.send("Página de produtos funcionando!");
});

module.exports = router;