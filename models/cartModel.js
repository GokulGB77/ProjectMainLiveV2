const  mongoose = require("mongoose");



const cartSchema = new mongoose.Schema({
  user:{type:String,required:true},
  cartProducts:[{
    product:{type:mongoose.Types.ObjectId,ref:'Productsdb',required: true},
    quantity:{type:Number,required:true,default:1},
    price:{type:Number,required:true},
    priceWithoutOffer:{type:Number,required:true},
    totalPrice:{type:Number,required:true},
    totalPriceWithoutOffer:{type:Number,required:true},
    orderStatus:{type:String,enum: ["pending","shipped","delivered", "cancelled",,"return-requested","returned", ],default:"pending",},
    orderCancelReason: {type:String,},
    additionalReason:{type:String,},
  }],
  cartTotal:{type:Number,required:true,default:0},
  couponApplied:{type:String},
  couponDiscount:{type:Number,default:0},
})

module.exports = mongoose.model("Cartdb", cartSchema);
