const express = require('express');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const cors = require('cors');
const redirectMiddleware = require('./middlewares/redirectMiddleware');
const logMiddleware = require('./middlewares/logMiddleware');
const rateLimit = require('./middlewares/rateLimit');

const app = express();
const port = 4000;

const corsOptions = {
  origin: 'https://tomepromo.com.br',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(express.json());
app.use(cors(corsOptions));
app.use(redirectMiddleware);
app.use(logMiddleware);
app.use(rateLimit);

app.get('/', (request, response) => {
  response.send('Hello World');
});

app.use('/categories', categoryRoutes);
app.use('/products', productRoutes);
app.use('/services', serviceRoutes);

app.listen(port, () => {
  console.log('Servidor rodando em http://localhost:' + port);
});
