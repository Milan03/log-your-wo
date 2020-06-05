const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const Base64 = require("js-base64").Base64;

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
app.post("/sendmail", function (req, res) {
    let request = req.body;
    // convert base64 PDF contents to local PDF
    let stringToDecode = request.attachments[0];
    let bin = Base64.atob(stringToDecode);
    fs.writeFile(`Log Your Workout - ${request.date}.pdf`, bin, 'binary', error => {
        if (error)
            throw error;
        else { // if successful, send email off with PDF attachment
            console.log('Binary saved!');
            let pathToPDF = `${process.cwd()}\\Log Your Workout - ${request.date}.pdf`;
            // setup email
            let mailOptions = {
                from: request.from,
                to: request.to,
                subject: request.subject,
                attachments: [{
                    filename: `Log Your Workout - ${request.date}.pdf`,
                    path: pathToPDF,
                    contentType: 'application/pdf'
                }],
                html: request.body
            };
            // send off email
            transport.sendMail(mailOptions, function (error, response) {
                if (error) {
                    console.log(error);
                    return;
                }
                console.log("Message sent: " + response.response);
                // shut down the connection pool, no more messages
                transport.close();
                res.sendStatus(200);
            });
        }
    });
});