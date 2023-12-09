const express = require('express');

const router = express.Router()

router.get("/status", async (req, res) => {
  res.status(200).json("Online")
})

module.exports = router;