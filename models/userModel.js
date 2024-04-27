const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name:{type:String,},
  email:{type:String,},
  mobile:{type:String,},
  addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Addressdb" }],
  password:{type:String,},
  is_admin:{type:Number,default:0},
  is_verified:{type:Number,default:0},
  is_google_auth:{type:Number,default:0},
  referralCode:{type:String},
  is_referred:{type:Number,default:0},
  status:{type:Number,default:1}
});



module.exports = mongoose.model('Userdb',userSchema);
