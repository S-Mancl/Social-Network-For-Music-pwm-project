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
      name: 'POST',
      description: 'All POST requests',
    },
    {
      name: 'DELETE',
      description: 'All DELETE requests',
    },
    {
      name: 'General',
      description: 'Basic',
    },
    {
      name: 'User',
      description: 'Everything related to users',
    },
    {
      name: 'Data',
      description: 'Can be used to interact with data',
    },
    {
      name: 'Favorites',
      description: 'Can be used to interact with Favorites',
    },
    {
      name: 'Playlists',
      description: 'Can be used to interact with playlists',
    },
    {
      name: 'Groups',
      description: 'Can be used to interact with groups',
    }
  ],
};
//il file di output
const outputFile = './swagger-output.json';
//file da cui leggere tutte le rotte e tutti gli endpoint
const endpointsFiles = ['./app.js'];
//e poi si lancia il comando
swaggerAutogen(outputFile, endpointsFiles, doc);