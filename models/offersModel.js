const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: { type: String,  },
    startDate: { type: Date,},
    endDate: { type: Date,  },
    isActive: { type: Boolean, default: true },
    productOffer: {
      applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Productsdb" }],
      discountPercentage: { type: Number, default: 0 },
    },
    categoryOffer: {
      category: { type: mongoose.Schema.Types.ObjectId, ref: "Categoriesdb", },
      discountPercentage: { type: Number, default: 0, },
    },
    ReferralOffer: {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "Categoriesdb", },
      forExistingUser: { type: Number, default: 0, },
      forNewUser: { type: Number, default: 0, },
    },
  },
  {
    strictPopulate: false,
    timestamps: true,
  }
)

module.exports = mongoose.model('Offersdb',offerSchema);
