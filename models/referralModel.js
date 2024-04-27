const mongoose = require("mongoose");

const ReferralOfferSchema = new mongoose.Schema(
  {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "Userdb", },
      referredUsersIds: [{ type: String, }],
      forExistingUser: { type: Number, default: 0, },
      forNewUser: { type: Number, default: 0, },
   
  },
  {
    strictPopulate: false,
    timestamps: true,
  }
)

module.exports = mongoose.model('Referraldb',ReferralOfferSchema);
