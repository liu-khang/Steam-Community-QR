/*
------------------------------------------
Steam Community Profile QR Code Generator
------------------------------------------
Student ID: 23596322
Comment (Required):
When a user connects, the homepage shows the user that it requires a Steam ID to be inputted in the search bar.
When a Steam ID is inputted, a GET request is sent to the Steam Web API to retrieve the user's Steam profile information.
Once we have the user's Steam profile information, we will then extract the link to the user's Steam community profile page.
The program will then send a request to the QR Code Generator API with the Steam community profile URL.
Once the QR code image is acquired it is then saved and finally displayed on the user's end.
------------------------------------------
*/

const port = 3000;
const https = require('https');
const http = require('http');
const server = http.createServer();
const fs = require('fs');
const url = require('url');
const apiKeyLocation = require('./key/apikey.json');
const apiKey = apiKeyLocation.key;
const cacheLocation = ('./cache/');

const getSteamData = function(steamID, res){ //Sends a GET request to the Steam API to return player information associated with the Steam ID
    const steamEndpoint = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamID}`;
    https.request(steamEndpoint, {method:"GET"}, retrieveSteamData).end();
    function retrieveSteamData(jsonStream){ //Builds JSON file and then parses
        let data = "";
        jsonStream.on("data", chunk => data += chunk);
        jsonStream.on("end", () => steamResults(JSON.parse(data), res));
    }
}

const steamResults = function(data, res){ 
    //Retrieve the user's Steam profile URL from steamUser and then call the generateQR function to contact the QR Code Generator API
    try { 
        let steamProfileURL = data.response.players[0].profileurl; 
        let steamID = data.response.players[0].steamid;
        generateQR(res, steamProfileURL, steamID);
    }
    catch(TypeError) {
        res.writeHead(200, {'Context-Type':'text/plain'});
        res.write("ERROR - INVALID STEAM ID");
        res.end();
    } //Catches error and redirects user if the numbers entered do not match a real Steam ID
}

const generateQR = function(res, steamProfileURL, steamID) { 
    let qrCacheDirectory = cacheLocation+steamID+".png";
    if(!fs.existsSync(qrCacheDirectory)) { //If current QR code does not exist in cache, save it to the cache then display to user           
        
        //Sends a GET request to the QR Code Generator API to generate a QR code containing the user's Steam community profile page
        const qrCodeGeneratorEndpoint = `https://api.qrserver.com/v1/create-qr-code/?data=${steamProfileURL}&size=500x500`;
        
        https.get(qrCodeGeneratorEndpoint, function(cacheQR) { 
            //Saves the QR code image to our cache folder 
            let newQR = fs.createWriteStream(cacheLocation+steamID+".png", {'encoding' :null}); 
            cacheQR.pipe(newQR); 
        
            //Displays the QR code to the user
            res.writeHead(200, {"Content-Type":"image/png"});
            cacheQR.pipe(res);
        });
    }   
    else {
        res.writeHead(200, {"Content-Type":"image/png"}); 
		let cachedQR = fs.createReadStream(qrCacheDirectory); 
		cachedQR.pipe(res); //Displays the cached QR
    }
}

//Redirects user to certain page depending on what they enter after the domain
server.on("request", connectionHandler);
function connectionHandler(req, res) {
    if(req.url === "/") { //When user makes request to access to the root of the website, it will display main.html with the search bar
        const main = fs.createReadStream('html/main.html');
        res.writeHead(200, {'Content-Type':'text/html'});
        main.pipe(res);
    }
    else if(req.url === "/images/homepage.PNG"){ //Redirects user to page with homepage banner if they view the image
		const homepageimg = fs.createReadStream("./images/homepage.PNG");
		res.writeHead(200, {'Context-Type':'image/PNG'});
		homepageimg.pipe(res);
    }
    else if(req.url.startsWith('/search')){ //If the user makes a QR generate request
		let urlAddress = url.parse(`${req.url}`, true); 
        if(isNaN(urlAddress.query.steamID)){ //If the input from the user was anything other than numbers redirect them to an error page
			res.writeHead(200, {'Context-Type':'text/plain'});
			res.write("ERROR - INVALID STEAM ID");
			res.end();
		}
		else{
			let steamID = urlAddress.query.steamID; //Gets the Steam ID that the user inputted
			getSteamData(steamID, res); //call getSteamData
		}
	}
	else { //If the current user tries to access a nonexistent webpage they get redirected to the error page
		res.writeHead(200, {'Context-Type':'text/plain'});
		res.write("ERROR 404 - PAGE NOT FOUND");
		res.end();
    }
}

//listening to the port
server.on("listening", listeningHandler);
server.listen(port);
function listeningHandler() {
    console.log(`Now listening on Port ${port}`);
}

