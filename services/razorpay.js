const Razorpay = require('razorpay');
const RAZORPAY_ID_KEY =  process.env.RAZORPAY_ID_KEY;
const RAZORPAY_SECRET =process.env.RAZORPAY_SECRET;

let instance = new Razorpay({
  key_id:RAZORPAY_ID_KEY,
  key_secret: RAZORPAY_SECRET ,
});


module.exports= instance;