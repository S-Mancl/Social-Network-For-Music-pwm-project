//istanzio
const swaggerAutogen = require('swagger-autogen')();
//configurazioni
const doc = {
  info: {
    title: 'Social Network for Music: Backend',
    description: 'The backend for SNM project',
  },
  host: 'localhost:3000',
  schemes: ['http'],
  tags: [
    {
      name: 'GET',
      description: 'All GET requests',
    },
    {
      name: 'PUT',
      description: 'All PUT requests',
    },
    {
      name: 'DELETE',
      description: 'All DELETE requests',
    },
    {
      name: 'General',
      description: 'Returns basic informations',
    },
    {
      name: 'Data',
      description: 'Can be used to interact with data',
    },
  ],
};
//il file di output
const outputFile = './swagger-output.json';
//file da cui leggere tutte le rotte e tutti gli endpoint
const endpointsFiles = ['./app.js'];
//e poi si lancia il comando
swaggerAutogen(outputFile, endpointsFiles, doc);