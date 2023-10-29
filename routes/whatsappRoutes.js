const express = require('express');
const whatsappController = require('../controllers/whatsappController');
const qrcode = require('qrcode');

const router = express.Router();

router.get('/qr', async (request, response) => {
  console.log("Rota QR");
  try {
    const qrCodeText = await whatsappController.generateQRCode(); // Supondo que generateQRCode() retorna o texto para o código QR
    console.log("Texto do QR Code:", qrCodeText); // Adicionando um console.log para verificar o texto do QR Code

    qrcode.toDataURL(qrCodeText, { errorCorrectionLevel: 'H' }, function (err, url) {
      if (err) {
        console.error("Erro ao gerar o código QR:", err);
        response.status(500).send('Erro ao gerar o código QR.');
      } else {
        response.send(`<img src="${url}">`); // Envia o código QR como resposta
      }
    });

  } catch (error) {
    if (error.message === "O código QR ainda não foi recebido.") {
      console.error("Erro ao gerar o código QR:", error);
      response.status(500).send('O código QR ainda não foi recebido. Tente novamente mais tarde.');
    } else {
      console.error("Erro ao gerar o código QR:", error);
      response.status(500).send('Erro ao gerar o código QR.');
    }
  }
});

router.post('/send', (request, response) => {
  whatsappController.sendMessageToWhatsApp(request, response)
    .then((result) => response.status(201).send(result))
    .catch((error) => response.status(500).send(error.message));
});

module.exports = router;
