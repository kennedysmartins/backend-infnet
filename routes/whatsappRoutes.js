const express = require('express');
const whatsappController = require('../controllers/whatsappController');

const router = express.Router();

router.post('/send', (request, response) => {
  whatsappController.sendMessageToWhatsApp(request, response)
    .then((result) => response.status(201).send(result))
    .catch((error) => response.status(500).send(error.message));
});

module.exports = router;
