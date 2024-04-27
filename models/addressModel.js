const { Int32 } = require("bson");
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "UserDb", required: false },
    addresses: [
        {
            name: { type: String, required: true },
            house: { type: String, required: true },
            street: { type: String, required: true },
            state: { type: String, required: true },
            city: { type: String, required: true },
            mobile:{type:Number, required: true },
            pincode: { type: Number, required: true },
            type: { type: String, default: "home" },
            setDefault:{type:Boolean,required:true,default:"false"}
        }
    ]
});


module.exports = mongoose.model("Addressdb", addressSchema);
