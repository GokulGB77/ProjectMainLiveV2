const mongoose = require("mongoose")

const googleSchema = new mongoose.Schema({
  googleId:{type:String,required:true},
  name:{type:String,},
  email:{type:String,},
  mobile:{type:String,},
  addresses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Addressdb" }],
  // is_admin:{type:Number,default:0},
  // is_verified:{type:Number,default:1},
  // status:{type:Number,default:1}
});



module.exports = mongoose.model('GoogleUserdb',googleSchema);
