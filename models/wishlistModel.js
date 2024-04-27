const  mongoose = require("mongoose");



const wishlistSchema = new mongoose.Schema({
  user:{type:String,required: true},
  wishlistItems:[{
    product:{type:mongoose.Types.ObjectId,ref:'Productsdb',required: true},
    price:{type:Number,required:true},
  }],
})

module.exports = mongoose.model("Wishlistdb", wishlistSchema);
