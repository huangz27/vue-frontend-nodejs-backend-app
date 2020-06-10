<template>

    <div class="container">
       <!--  <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">Vue Axios Post - ItSolutionStuff.com</div>
                    <div class="card-body">
                        <strong>Output:</strong>
                        <pre>

                        {{output}}

                        </pre>
                    </div>
                </div>
            </div>
        </div>
<button type="button" class="btn btn-primary" @click="createSession">Test REST API (return session ID)</button>
<button type="button" class="btn btn-primary" @click="createToken">Test REST API (return token)</button>
<button type="button" class="btn btn-primary" @click="joinSession">Join </button> -->
<!-- <button type="button" class="btn btn-primary" @click="logIn">Login </button>  -->
<!-- <button type="button" class="btn btn-primary" @click="downloadWithAxios">Download </button>  -->

        <div id="join" v-show="!joined">
            <h1>Join a video session</h1>
            <form @submit.prevent="joinSession"> 
                <p>
                    <label>Session:</label>
                    <input type="text" v-model="sessionId" required>
                </p>
                <p>
                    <input type="submit" value="JOIN">
                </p>
            </form>
        </div>

        <div id="session" v-show="joined">
            <h1 v-text="sessionId"></h1>
            <input type="button" @click="leaveSession" value="LEAVE">
            <button type="button" class="btn btn-primary" @click="start_record">Record Session </button>
            <button type="button" class="btn btn-primary" @click="stop_record">Stop Recording </button>
            <div >
                <div id ="publisher" ><h3>YOU</h3></div>
                <div id ="subscriber" ><h3>OTHERS</h3></div>
            </div>
            <!-- <div id="video-container">
            <video ref="videoRef" src="" width="30%" controls></video>
            </div> -->
        </div>
        
 
    </div>
    
</template>

     

<script>
import { OpenVidu } from 'openvidu-browser';

var OV;
var session;
var token;

    export default {

        mounted() {
            console.log('Component mounted.');
            console.log(window.location.hostname);
            // this.$refs.videoRef.src = "https://localhost:4443/recordings/sessionA/sessionA.mp4";
            window.onbeforeunload = () => { // Gracefully leave session
                    if (session) {
                        this.leaveSession();
                    }
                }
        },

        data() {
            return {
              joined: false,
              sessionId: "sessionA",
              recordingId: "",
              record_status: false,
            };
        },

        methods: {
            joinSession() {
            //joinSession(e) {
              //e.preventDefault(); //either use submit.prevent or pass event 

              this.getToken(this.sessionId).then(token => {

              OV = new OpenVidu();
              session = OV.initSession();

              session.on("streamCreated", function (event) {
                  session.subscribe(event.stream, "subscriber");
              });

              session.connect(token)
                .then(() => {
                    this.joined = true;
                    // var resolution_data = (window.innerWidth * 0.35) + "x";  //first half of the resolution is enough
                    // var publisher = OV.initPublisher("publisher", { resolution: resolution_data});
                    // session.publish(publisher);
                })
                .catch(error => {
                    console.log("There was an error connecting to the session:", error.code, error.message);
                    });
            })
              .catch(error => {
                console.warn('There was an error connecting to the session:', error.code, error.message);
            });
                // this.timer = setInterval(this.restartRecording, 3000)
            },

            leaveSession() {
                this.removeUser();
                session.disconnect();
                if (this.record_status) {
                    this.stop_record(); 
                }
                this.joined = false;
            },

            

            getToken(mySessionId) {
                // return this.createSession(mySessionId).then((sessionId) => this.createToken(sessionId));
                return new Promise((resolve, reject) => {
                    this.axios({
                        method:'post', 
                        url: "https://localhost:5000/api-sessions/get-token",
                        data: {session_id: mySessionId},
                        
                    })
                    .then(response => {
                        console.log("logged in with session id:" + mySessionId);
                        console.log(response.data.token);
                        token = response.data.token;
                        resolve(token);
                    })
                    .catch(error => {
                        console.log("error getting token, please try again")
                        console.log(error);
                        reject(error);
                    })
                });
            },

            removeUser() {
                this.axios({
                    method:'post', 
                    url: "https://localhost:5000/api-sessions/remove-user",
                    data: {session_id: this.sessionId, token: token},
                    
                })
                .then(response => {
                    console.warn("You have been removed from session: " + this.sessionId);
                    console.log(response);      
                })
                .catch(error => {
                    console.log('User couldn\'t be removed from session');
                    console.log(error);
                })
            },


            start_record() {
                this.axios({
                    method:'post', 
                    url: "https://localhost:5000/api-recording/start-record",
                    data: ({ 
                        session_id: this.sessionId }),   
                    })
                .then(response => {
                    console.log(response);
                    this.recordingId = response.data.id;
                    this.record_status = true;
                    console.log("started recording with recording id:" + this.recordingId);
                })
                .catch(error => {
                    console.error(error)
                });
            },

            stop_record(){
                this.axios({
                    method:'post', 
                    url: "https://localhost:5000/api-recording/stop-record",
                    data: ({ 
                        record_id: this.recordingId }),   
                       
                })
                .then(response => {
                    this.record_status = false;
                    console.log("stopped recording with recording id:" + response.data.id);
                    console.log(response);
                })
                .catch(error => {
                    console.error(error)
                });
            
            },

            // forceFileDownload(response){
            //       const url = window.URL.createObjectURL(new Blob([response.data]))
            //       const link = document.createElement('a')
            //       link.href = url
            //       link.setAttribute('download', 'file.mp4') //or any other extension
            //       document.body.appendChild(link)
            //       link.click()
            // },
            // downloadWithAxios(){
            //   this.axios({
            //     method: 'get',
            //     url: "https://localhost:4443/recordings/sessionA/sessionA.mp4",
            //     responseType: 'arraybuffer'
            //   })
            //   .then(response => {
                
            //     this.forceFileDownload(response)
                
            //   })
            //   .catch(() => console.log('error occured'))
            // },

            // restartRecording(){
            //     this.stop_record();
            //     this.start_record();
            // }
            // logIn() {
            //     var user_name = "publisher1"; // Username
            //     var pass_word = "pass"; // Password

            //     this.axios({
            //         method:'post', 
            //         url: "https://localhost:5000/api-login/login",
            //         data: {user: user_name, pass: pass_word},
                    
            //     })
            //     .then(response => {
            //         console.log("logged in");
            //         console.log(response);
            //     })
               
                // var user = "publisher1";
                // var pass = "pass";
                // this.httpPostRequest(
                //     'https://localhost:5000/api-login/login',
                //     {user: user, pass: pass},
                //     'Login WRONG',
                //     (response) => {
                //         console.log(response)
                //     }
                // );
            // },

            // httpPostRequest(url, body, errorMsg, callback) {
            //     var http = new XMLHttpRequest();
            //     http.open('POST', url, true);
            //     http.setRequestHeader('Content-type', 'application/json');
            //     http.addEventListener('readystatechange', processRequest, false);
            //     http.send(JSON.stringify(body));

            //     function processRequest() {
            //         if (http.readyState == 4) {
            //             if (http.status == 200) {
            //                 try {
            //                     callback(JSON.parse(http.responseText));
            //                 } catch (e) {
            //                     callback();
            //                 }
            //             } else {
            //                 console.warn(errorMsg);
            //                 console.warn(http.responseText);
            //             }
            //         }
            //     }
            // },

        }

    }


</script>

<style scoped>
#publisher {    
    float: left;
    margin: 10px;
    width: 40%;
}

#subscriber {
    float: right;
    margin: 10px;
    width: 40%;
}
</style>

