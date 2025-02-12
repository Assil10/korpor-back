const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Korpor API Documentation',
      version: '1.0.0',
    },
    servers: [
      { url: 'http://localhost:5000' }
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // Specify where your annotated files are
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
