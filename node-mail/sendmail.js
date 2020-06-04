const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

// create new instance of Express app and configure
const app = express();
app.use(cors());
app.use(bodyParser.json());

//start application server on port 3000
app.listen(3000, () => {
    console.log("The server started on port 3000");
});

let myEmail = "milansobat03@gmail.com";

// setup nodemailer transport object
let transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: myEmail,
        pass: 'a34DJ8@8'
    }
});

// 'sendmail' POST call which instantiates mail options and send mail call
app.post("/sendmail", function(req, res) {
    let request = req.body;
    // Setup email
    var mailOptions = {
        from: request.from,
        to: request.to,
        subject: request.subject,
        attachments: request.attachments,
        html: request.body
    };
    transport.sendMail(mailOptions, function(error, response){
        if(error) { 
            console.log(error);
            return;
        } 
        console.log("Message sent: " + response.response);
        // shut down the connection pool, no more messages
        transport.close();
        res.sendStatus(200);
    });
});