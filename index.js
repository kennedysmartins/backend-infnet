const express = require('express');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const cors = require('cors');
const redirectMiddleware = require('./middlewares/redirectMiddleware');
const logMiddleware = require('./middlewares/logMiddleware');
const rateLimit = require('./middlewares/rateLimit');

const productController = require('./controllers/productController')

const app = express();
const port = 4000;

app.use(express.json());
app.use(cors());
app.use(redirectMiddleware);
app.use(logMiddleware);
app.use(rateLimit);

app.get('/', (request, response) => {
    response.send("Hello World");
});

app.use((req, res, next) => {
    const allowedOrigins = ['https://tomepromo.com.br'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    next();
});

app.use('/categories', categoryRoutes);
app.use('/products', productRoutes);
app.use('/services', serviceRoutes);
app.use('/message', whatsappRoutes);

app.listen(port, () =>{
    console.log('Servidor rodando em http://localhost:'+ port);
});

// async function fetchData() {
//     try {
//       const products = await productController.getProductsDB();
//       console.log(products);
//     } catch (error) {
//       console.error(error);
//     }
//   }
  
//   fetchData();