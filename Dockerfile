FROM node:18-alpine
#set right time zone - i need it for logging
ENV TZ="Europe/Rome"
# Create app directory
WORKDIR /app
# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY src/package*.json ./
# install the modules
RUN npm install
# Bundle app source
COPY ./src .
#expose the right port... I don't yet know TODO TO DO
EXPOSE 3000

CMD [ "npm", "start" ]