const mongoose = require("mongoose");

// const transactionSchema = new mongoose.Schema(
//   {
//     amount: {type: Number,required: true,},
//     description:{type: String,required:true},
//     type: {type: String,required: true,},
//   },
//   {
//     timestamps: true,
//   }
// );

const walletSchema = new mongoose.Schema(
  {
    user: {type: mongoose.Schema.Types.ObjectId,ref: "Userdb",required: true,},
    balance: {type: Number,required: true,},
    transactions: [{
      amount: { type: Number, required: true },
      description: { type: String, required: true },
      type: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
  },
  {
    strictPopulate: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Walletdb", walletSchema);