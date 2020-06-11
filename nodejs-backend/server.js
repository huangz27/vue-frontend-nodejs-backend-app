/* CONFIGURATION */

var OpenVidu = require('openvidu-node-client').OpenVidu;
var OpenViduRole = require('openvidu-node-client').OpenViduRole;

// Check launch arguments: must receive openvidu-server URL and the secret
if (process.argv.length != 4) {
    console.log("Usage: node " + __filename + " OPENVIDU_URL OPENVIDU_SECRET");
    process.exit(-1);
}
// For demo purposes we ignore self-signed certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// Node imports
var express = require('express');
var fs = require('fs');
var session = require('express-session');
var https = require('https');
var bodyParser = require('body-parser'); // Pull information from HTML POST (express4)
var app = express(); // Create our app with express
var cors = require('cors');
const axios = require('axios');

//var corsOptions = {
//   origin: process.env.CORS_ORIGIN || "*"
//};

// Server configuration
app.use(session({
    saveUninitialized: true,
    resave: false,
    secret: 'MY_SECRET'
}));
//app.use(express.static(__dirname + '/public')); // Set the static files location /home/zhiwei/vue-openvidu-app/dist

app.use(bodyParser.urlencoded({
    'extended': 'true'
})); // Parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // Parse application/json
app.use(bodyParser.json({
    type: 'application/vnd.api+json'
})); // Parse application/vnd.api+json as json
app.use(cors());
// Listen (start app with node server.js)
var options = {
    key: fs.readFileSync('openvidukey.pem'),
    cert: fs.readFileSync('openviducert.pem')
};
https.createServer(options, app).listen(5000);

// Mock database
var users = [{
    user: "publisher1",
    pass: "pass",
    role: OpenViduRole.PUBLISHER
}, {
    user: "publisher2",
    pass: "pass",
    role: OpenViduRole.PUBLISHER
}, {
    user: "subscriber",
    pass: "pass",
    role: OpenViduRole.SUBSCRIBER
}];

// Environment variable: URL where our OpenVidu server is listening
var OPENVIDU_URL = process.argv[2];
// Environment variable: secret shared with our OpenVidu server
var OPENVIDU_SECRET = process.argv[3];

// Entrypoint to OpenVidu Node Client SDK
var OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

// Collection to pair session names with OpenVidu Session objects
var mapSessions = {};
// Collection to pair session names with tokens
var mapSessionNamesTokens = {};

// Collection to pair session names with status
var mapSessionsStatus = {};

//Collection to pair session names with connection ID for IP cameras
var mapSessionsConnectionID = {};

// Number of devices (PLEASE MAKE IT DYNAMIC LATER ON)
var number_of_devices = 2;


console.log("App listening on port 5000");

/* CONFIGURATION */


/* REST API */

// Get token (add new user to session)
app.post('/api-sessions/get-token', function (req, res) {

        // The video-call to connect
        var sessionName = req.body.session_id;
        var role = req.body.role

        // Role associated to this user
        // var role = users.find(u => (u.user === req.session.loggedUser)).role;
        // var role = OpenViduRole.PUBLISHER;

        // Optional data to be passed to other users when this user connects to the video-call
        // In this case, a JSON with the value we stored in the req.session object on login
        // var serverData = JSON.stringify({ serverData: "publisher1" });

        console.log("Getting a token | {sessionName}={" + sessionName + "}");

        // Build tokenOptions object with the serverData and the role
        var tokenOptions = {
            //data: serverData,
            role: role//role
        };

        if (mapSessions[sessionName]) {
            // Session already exists
            console.log('Existing session ' + sessionName);

            // Get the existing Session from the collection
            var mySession = mapSessions[sessionName];

            // Generate a new token asynchronously with the recently created tokenOptions
            mySession.generateToken(tokenOptions)
                .then(token => {

                    // Store the new token in the collection of tokens
                    mapSessionNamesTokens[sessionName].push(token);

                    // Return the token to the client
                    res.status(200).send({
                        token: token
                    });
                })
                .catch(error => {
                    console.error(error);
                    res.status(error).send(error);
                    delete mapSessions[sessionName];
                });
        } else {
            // New session
            console.log('New session ' + sessionName);

            // Create a new OpenVidu Session asynchronously
            OV.createSession({"customSessionId": sessionName})  //MUST ADD customsessionID for recording
                .then(session => {
                    // Store the new Session in the collection of Sessions
                    mapSessions[sessionName] = session;
                    // Store a new empty array in the collection of tokens
                    mapSessionNamesTokens[sessionName] = [];

                    // Generate a new token asynchronously with the recently created tokenOptions
                    session.generateToken(tokenOptions)
                        .then(token => {

                            // Store the new token in the collection of tokens
                            mapSessionNamesTokens[sessionName].push(token);

                            // Return the Token to the client
                            res.status(200).send({
                                token: token
                            });
                        })
                        .catch(error => {
                            console.error(error);
                        });
                })
                .catch(error => {
                    console.error(error);
                });
        }
});

// Remove user from session
app.post('/api-sessions/remove-user', function (req, res) {
        var sessionName = req.body.session_id;
        var token = req.body.token;
        console.log('Removing user | {sessionName, token}={' + sessionName + ', ' + token + '}');

        // If the session exists
        if (mapSessions[sessionName] && mapSessionNamesTokens[sessionName]) {
            var tokens = mapSessionNamesTokens[sessionName];
            var index = tokens.indexOf(token);

            // If the token exists
            if (index !== -1) {
                // Token removed
                tokens.splice(index, 1);
                console.log(sessionName + ': ' + tokens.toString());
            } else {
                var msg = 'Problems in the app server: the TOKEN wasn\'t valid';
                console.log(msg);
                res.status(500).send(msg);
            }
            if (tokens.length == 0) {
                // Last user left: session must be removed
                console.log(sessionName + ' empty!');
                var success_msg = sessionName + ' closed';
                // var current_session = mapSessions[sessionName];
                // current_session.close().then(() => console.log(success_msg));
                delete mapSessions[sessionName];
                delete mapSessionsStatus[sessionName];
            }
            res.status(200).send(success_msg);
        } else {
            var msg = 'Problems in the app server: the SESSION does not exist';
            console.log(msg);
            res.status(500).send(msg);
        }

});

// Start recording the session using session ID as recording ID
app.post('/api-recording/start-record', function (req, res) {
    
    var sessionName = req.body.session_id;

    //only can start recording if status is connected
    // if (mapSessionsStatus[sessionName]) {
        OV.startRecording(sessionName).then(recordingStarted => {
            var recordingID = recordingStarted.id; 
            console.log("successfully started recording:" + recordingID);
            //send recording id and properties to the client
            res.status(200).send({
                id: recordingStarted.id ,
                status: recordingStarted.status,
                properties: recordingStarted.properties
            });
        })
        .catch(error => {
            console.error(error.message);
            res.status(error.message).send("error" + error.message);
        });
    // }
});

// Stop recording the session using session ID as recording ID
app.post('/api-recording/stop-record', function (req, res) {

    var recordingID = req.body.record_id;
    console.log(recordingID);

    OV.stopRecording(recordingID).then(recordingStopped => {

        console.log("successfully stopped recording:" + recordingStopped.id);
        
        //send recording id, url and properties to the client
        res.status(200).send({
            status: recordingStopped.status,
            id: recordingStopped.id,
            url: recordingStopped.url,
            properties: recordingStopped.properties
        });
    })
    .catch(error => {
        console.error(error);
        res.status(500).send(error);
    });
});

app.get('/api-sessions/obtain-device-list', function (req, res) {

    OV.fetch().then(anyChange => {
        var activeSessions = OV.activeSessions;
        // console.log(activeSessions[0].activeConnections);
        mapSessionsStatus = {};  //reset map session status object to empty at the start of the api call

        for (var i = 0; i<activeSessions.length; i++) {
            //check if session was inititalised properly on backend before setting it to be connected
            var sessionName = activeSessions[i].sessionId;
            if (mapSessions[sessionName]) {

                //within each active session, there can be multiple connections, check the publishers of each connection
                for (var j = 0; j<activeSessions[i].activeConnections.length; j++) {
                    if (activeSessions[i].activeConnections[j].publishers.length) {
                        mapSessionsStatus[sessionName] = "connected"; 
                        console.log(sessionName + " publisher connected")
                    }
                }
                
            };
        };
        if (activeSessions.length == 0) {
            console.log("No active sessions");
            mapSessions = {}; //reset map session object back to empty
        }
        //console.log(mapSessionsStatus);

        var response = {};
        for (var x = 1; x <= number_of_devices; x++) {
          response[x] = {
            device_name: "device" + x,
            Session_id: "camera" + x,
            Status: mapSessionsStatus["camera" + x] || "not connected" ,  //if session status is undefined, it will appear as not connected
            };
        }
        console.log(response);
        res.send(response);
    });
});

app.get('/api-recording/:recordingid', function (req, res) {

    OV.getRecording(req.params.recordingid).then(recordingRetrieved => { 

        var date = new Date(recordingRetrieved.createdAt);

        res.status(200).send({
            id: recordingRetrieved.id,
            timestamp_raw: recordingRetrieved.createdAt,
            timestamp: date.toString(),
            url: recordingRetrieved.url,
            duration: recordingRetrieved.duration,
            size: recordingRetrieved.size,
            status: recordingRetrieved.status,
        });

    })
    .catch(error => {
        console.log(error);
        var msg = "no recording exists for the passed RECORDING_ID"
        res.status(404).send(msg);
    });
 
});

app.get('/api-recording/session/:sessionid', function (req, res) {
    var session_id = req.params.sessionid;

    OV.listRecordings().then(recordingList => {

        var list_of_recording = {}; 
        for (var x = 0; x < recordingList.length; x++) {
            
            if (session_id == recordingList[x].sessionId)
                var date = new Date(recordingList[x].createdAt);

                list_of_recording[x] = {
                    id: recordingList[x].id,
                    timestamp_raw: recordingList[x].createdAt,
                    timestamp: date.toString(),
                    url: recordingList[x].url,
                    duration: recordingList[x].duration,
                    size: recordingList[x].size,
                    status: recordingList[x].status
                 }
        }
        console.log(list_of_recording);
        res.status(200).send(list_of_recording);

    })
    .catch(error => {
        console.log(error);
        var msg = "no recording exists for the passed sessionid"
        res.status(404).send(msg);
    });
 
});

app.delete('/api-recording/:record_id', function (req, res) {
    var record_id = req.params.record_id;
    OV.deleteRecording(record_id).then( () => {
        console.log("Successfully deleted recording")
        res.status(200).send('Successfully deleted recording with id: ' + record_id + ' on server')
    })
    .catch(error => {
        console.log(error);
        var msg = "no recording exists with record_id"
        res.status(error.message).send("error " + error.message);
    });

  
});

app.post('/api-sessions/ip-camera-publisher', function (req, res) {
    
    var sessionName = req.body.session_id;
    var data = JSON.stringify({
          rtspUri: req.body.rtspUri
        });
    console.log(data);
    new Promise((resolve, reject) => {
        axios.post(
            'https://' + 'localhost:4443' + '/api/sessions/'+ sessionName +'/connection',
            data,
            {
              headers: {
                'Authorization': getBasicAuth(),
                'Content-Type': 'application/json'
              }
            }
        )
        .then(response => {
            console.log(respose);
            resolve(response);
        })
        .catch(error => {
            console.log(error);
            reject(error);
        // 400: problem with some body parameter
        // 404: no session exists for the passed SESSION_ID
        // 500: unexpected error when publishing the IP camera stream into the session. See the error message for further information
        });
    
    })
    .then(response => {
        res.send(response);
        mapSessionsConnectionID[sessionName] = response.connectionId;
        console.log("publishing ip camera");
    })
    .catch(error => {
        res.status(error.response.status).send(error);
    });
    
});

app.delete('/api-sessions/ip-camera-unpublish/:sessionId/:connectionId', function (req, res) {
    var sessionName = req.params.sessionId;
    var mySession = mapSessions[sessionName];
    // mySession.forceDisconnect(mapSessionsConnectionID[sessionName]).then(() => {
    mySession.forceDisconnect(req.params.connectionId).then(() => {
        console.log("unpublish ip camera");
        res.status(200).send('Successfully unpublish ip camera');
    })
    .catch(error => {
        console.log(error);
        res.status(error.message).send("error " + error.message);
    });

});

/* REST API */



/* AUXILIARY METHODS */

function login(user, pass) {
    return (users.find(u => (u.user === user) && (u.pass === pass)));
}

function isLogged(session) {
    return (session.loggedUser != null);
}

function getBasicAuth() {
    return 'Basic ' + (new Buffer('OPENVIDUAPP:' + OPENVIDU_SECRET).toString('base64'));
}

/* AUXILIARY METHODS */
