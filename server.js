express = require('express');
const proxy = require('express-http-proxy');
const app = express();
let mRouterUrl=(process.env.MR_IP ? `http://${process.env.MR_IP}:` : `http://message-router.onap:`);
mRouterUrl += (process.env.MR_PORT ? `${process.env.MR_PORT}/events` : `3904/events`);
let crypto = require('crypto');
let transactionId = crypto.randomBytes(10).toString('hex');

app.use(express.static('src'));

let vesEvents = [];
let response = [];
let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
let topic = require('process').env.VES_TOPIC;

function makeRequest(url) {
  let xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    getVesEvents(xhr);
  };
  xhr.open('GET', url, true);
  xhr.send();
}

function getVesEvents(xhr) {
  console.log(xhr.readyState + xhr.status);
  if (xhr.readyState == 4 && xhr.status == 200) {
    response = JSON.parse(xhr.responseText);
    for (let i=0; i<response.length; i++) {
      if (vesEvents.length>=100) {
        vesEvents.pop();
      }
      vesEvents.unshift(response[i]);
    }
    console.log('ok '+vesEvents[0]+vesEvents.length);
  }
}

let router = express.Router();
router.get('/', function(req, res) {
  res.json({message: 'hooray! welcome to our api!'});
});

app.use('/api', router);

router.route('/vesEvents')
    .get(function(req, res) {
        res.json(vesEvents);
    });

let ip = require('ip');
app.listen(4200, () => console.log(`Listening on ${ip.address()}:4200`));
app.use('/proxy', proxy('http://localhost:4200'));
setInterval(function() {
    makeRequest(`${mRouterUrl}/${topic}/${transactionId}/1?timeout=120`);
  }, process.env.TIMEOUT);
