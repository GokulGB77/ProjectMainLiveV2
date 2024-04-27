const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const categoriesSchema = new mongoose.Schema({
    categoryName: {type: String,required: true},
    categoryDetails: {type: String,required: true},
    categoryStatus:{type:Number,required:true,default:0},
    categoryOffer: {type: Number,required: true},
    
  });

module.exports = mongoose.model("Categoriesdb", categoriesSchema);