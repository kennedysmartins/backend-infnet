require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client, LocalAuth, MessageMedia  } = require("whatsapp-web.js");
const qrcodeTerminal = require("qrcode-terminal");


let qrCodeValue = null;
let client;

if(process.env.ENVIRONMENT ==="DEVELOPMENT"){
  console.log("Servidor de Desenvolvimento")
}

if (process.env.ENVIRONMENT === "PRODUCTION") {
  console.log("Servidor de Produção")
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

  client.on("message_create", async (msg) => {
    // console.log("Mensagem do Bot!\n", msg);
  });

  client.on("message", async (msg) => {
    let chat = await msg.getChat();
    // console.log(msg)
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
      await delay(10000); // Espera 5 segundos
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

const downloadImage = async (url, dest) => {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(dest);

  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    let error = null;
    writer.on('error', (err) => {
      error = err;
      writer.close();
      reject(err);
    });
    writer.on('close', () => {
      if (!error) {
        resolve();
      }
    });
  });
};


const sendMessageToWhatsApp2 = async (req, res) => {
  try {
    const phoneNumber = req.body.phoneNumber;
    const message = req.body.message;
    const buyLink = req.body.buyLink;
    const thumbnail = req.body.thumbnail;
    const chatId = phoneNumber;

    console.log('Downloading and saving thumbnail...');
    // Download and save the thumbnail to a temporary file
    const tempImagePath = path.join(__dirname, 'temp_thumbnail.jpg');
    await downloadImage(thumbnail, tempImagePath);
    console.log('Thumbnail downloaded and saved successfully.');

    console.log('Converting the saved image to base64...');
    // Convert the saved image to base64
    const yourBase64Image = fs.readFileSync(tempImagePath, { encoding: 'base64' });
    console.log('Image converted to base64 successfully.');

    // Remove the temporary image file
    // fs.unlinkSync(tempImagePath);

    console.log('Getting chat by ID...');
    const chat = await client.getChatById(chatId);
    if (chat) {
      console.log('Sending message...');
      await chat.sendMessage(message, {  linkPreview: true,
        extra: {
          ctwaContext: {
            sourceUrl: buyLink,
            thumbnail: yourBase64Image,
            mediaType: 0,
            title: 'test',
            description: 'description',
            // isSuspiciousLink: null,
          },
        },
      });
      console.log('Message sent successfully.');
      res.status(200).json({ success: true, message: 'Success.' });
    } else {
      console.log('Unable to find chat.');
      res.status(404).json({
        success: false,
        message: 'Unable to find chat.',
      });
    }
  } catch (error) {
    console.error('Error occurred:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending the message.',
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
  sendMessageToWhatsApp2
};
