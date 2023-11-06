require('dotenv').config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcodeTerminal = require("qrcode-terminal");


let qrCodeValue = null;
let client;

if(process.env.ENVIRONMENT ==="DEVELOPMENT"){
  console.log("Servidor de Desenvolvimento")
}

if (process.env.ENVIRONMENT === "PRODUCTION") {
  client = new Client({
    authStrategy: new LocalAuth(),
  });

  client.on("loading_screen", (percent, message) => {
    console.log("LOADING SCREEN", percent, message);
  });

  client.on("qr", (qr) => {
    console.log("QR RECEBIDO");
    qrcodeTerminal.generate(qr, { small: true });
    qrCodeValue = qr;
  });

  client.on("authenticated", () => {
    console.log("AUTHENTICATED");
  });

  client.on("auth_failure", (msg) => {
    console.error("AUTHENTICATION FAILURE", msg);
  });

  client.on("ready", () => {
    console.log("Client is ready!");
  });

  client.on("message", async (msg) => {
    let chat = await msg.getChat();

    if (chat.isGroup && chat.groupMetadata.announce) {
      try {
        const senderId = chat.lastMessage.author.split("@")[0];
        const isAdmin = chat.groupMetadata.participants.some((participant) => {
          return participant.id.user === senderId && participant.isAdmin;
        });

        if (!isAdmin) {
          console.log("O remetente não é um administrador.");
          const deletedMessage = chat.lastMessage.body;
          await msg.delete(true);
          const removedParticipantName = chat.lastMessage.notifyName;
          const owner = chat.groupMetadata.owner._serialized;
          await client.sendMessage(
            owner,
            `O participante ${removedParticipantName} foi removido. 
  Mensagem excluída: 
  
  ${deletedMessage}`
          );
        }
      } catch (error) {
        console.error("Ocorreu um erro:", error);
      }
    }
  });

  client.initialize();
}

const sendMessageToWhatsApp = async (req, res) => {
  console.log("Enviando mensagem para WhatsApp");
  try {
    const phoneNumber = req.body.phoneNumber; // Número de telefone para o qual enviar a mensagem
    const message = req.body.message; // Mensagem a ser enviada
    const chatId = phoneNumber;
    const chat = await client.getChatById(chatId);
    if (chat) {
      const delay = (ms) => new Promise((res) => setTimeout(res, ms));
      await chat.sendStateTyping();
      await delay(3000); // Espera 5 segundos
      await chat.sendMessage(message, {
        linkPreview: { includePreview: true },
      });
      console.log("Mensagem enviada com sucesso")
      res
        .status(200)
        .json({ success: true, message: "Mensagem enviada com sucesso." });
    } else {
      console.log("Não foi possível encontrar o chat")
      res.status(404).json({
        success: false,
        message: "Não foi possível encontrar o chat.",
      });
    }
  } catch (error) {
    console.error("Erro ao enviar a mensagem:", error);
    res.status(500).json({
      success: false,
      message: "Ocorreu um erro ao enviar a mensagem.",
    });
  }
};

const generateQRCode = async () => {
  return new Promise((resolve, reject) => {
    if (qrCodeValue) {
      resolve(qrCodeValue);
    } else {
      reject(new Error("O código QR ainda não foi recebido."));
    }
  });
};

module.exports = {
  generateQRCode,
  sendMessageToWhatsApp,
};
