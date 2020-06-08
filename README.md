# vue-frontend-nodejs-backend-app

### Setup backend server (after cloning)
Ensure node is installed first
```
$ sudo curl -sL https://deb.nodesource.com/setup_12.x | sudo bash -
$ sudo apt-get install -y nodejs
```
Setup and run the server
```
$ cd vue-frontend-nodejs-backend-app/nodejs-backend
$ npm install
$ node server.js https://localhost:4443 MY_SECRET
```
API documentation here: [link](https://docs.google.com/document/d/1QOctNGe9xRQrzgp_gkEX_eVE41ymubZAy8pi03vsQvM/edit)

### Credits to openvidu
Reference to openvidu node js tutorial [here](https://docs.openvidu.io/en/2.14.0/tutorials/openvidu-js-node/)