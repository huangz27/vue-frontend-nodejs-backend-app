
[![Version](https://badge.fury.io/gh/tterb%2FHyde.svg)]()
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

### Setup vue frontend development server (after cloning)
```
$ cd vue-frontend-nodejs-backend-app/vue-frontend
$ npm install
$ npm run serve
```
### Credits to openvidu
Reference to openvidu node js tutorial [here](https://docs.openvidu.io/en/2.14.0/tutorials/openvidu-js-node/)

### Setup live555 media server for simulate rtsp (after cloning) [only for linux]

Put transfer your .webm, .mkv files (tested with these 2 file types) into the directory: vue-frontend-nodejs-backend-app/live/mediaServer
```
$ cd vue-frontend-nodejs-backend-app/live/mediaServer
$ ./live555MediaServer 
```
The server will run and you can access the rtsp streams using VLC player [link](https://flir.custhelp.com/app/answers/detail/a_id/1053/~/vlc-media-player---display-and-record-a-video-stream-%28automation-cameras%29)



