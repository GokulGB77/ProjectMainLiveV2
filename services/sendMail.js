const nodemailer = require("nodemailer")
require('dotenv').config();

const sendEmailOtp = async (email, subject, html
  ) =>{
  const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
        user: process.env.MAIL,
        pass: process.env.PASS
    }
  })
  const mailOptions = {
    from: process.env.MAIL, 
    to: email,
    subject: subject,
    html : html,
  };
  

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification Mail Sent Successfully");
  } catch (error) {
    console.error("Error sending mail:", error);
  }
  
}



module.exports = sendEmailOtp;
