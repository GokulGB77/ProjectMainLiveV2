const Couponsdb = require("../models/couponsModel")

const loadCoupons = async (req, res) => {
  try {
    const perPage = 5;
    const page = parseInt(req.query.page) || 1;
    const totalCoupons = await Couponsdb.countDocuments();
    // const totalCoupons = await Couponsdb.countDocuments({
    //   expiryDate: { $gte: new Date() },
    // });
    const totalPages = Math.ceil(totalCoupons / perPage);

    const coupons = await Couponsdb.find()
      // .populate({ path: 'category', select: 'categoryName' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage) || null;


    res.render("coupons",
      {
        coupons,
        totalCoupons,
        totalPages,
        currentPage: page
      })
  } catch (error) {
    res.status(500).send("Internal Server Error")
    console.log("Coupon load error", error)
  }
}



const addCoupon = async (req, res) => {
  try {
    const { name, code, discountType, discountValue, expiryDate, minimumOffer, maximumOffer } = req.body;
    const formattedExpiryDate = new Date(expiryDate);
    const coupon = await Couponsdb.create({
      name,
      code,
      discountType,
      discountValue,
      expiryDate: expiryDate,
      minimumOffer,
      maximumOffer,
      status: 'active',
    });
    console.log("coupon added succesfullyy...")
    req.session.toastMessage = "Coupon added successfully"; 
    // req.session.save()
    // res.status(200).json({ success: true, coupon });
    res.redirect("/admin/coupons")
  } catch (error) {
    res.status(500).send("Internal Server Error");
    console.log("Coupon load error", error);
  }
};


const updateCoupon = async (req, res) => {
  try {
    const { couponId, name, code, discountType, discountValue, minimumOffer, maximumOffer, expiryDate } = req.body;
    const formattedExpiryDate = new Date(expiryDate);

    // Format the expiry date as "dd-mm-yyyy"
    const formattedDate = formattedExpiryDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
    
    console.log("CouponId:", couponId);
    const coupon = await Couponsdb.findByIdAndUpdate( couponId , {
      $set: {
        name: name,
        code: code,
        discountType: discountType,
        discountValue: discountValue,
        minimumOffer: minimumOffer,
        maximumOffer: maximumOffer,
        expiryDate: expiryDate
      }
    })
    console.log("coupon updated succesfullyy...")
    req.session.toastMessage = "Coupon details updated successfully"; 
    // req.session.save()
    res.redirect("/admin/coupons")
  } catch (error) {
    res.status(500).send("Internal Server Error")
    console.log("Coupon load error", error)
  }
}

const changeStatus = async (req, res) => {
  try {
      const couponId = req.query.id;
      const newStatus = req.query.status === 'active' ? 'inactive' : 'active'; // Toggle status
      const update = { status: newStatus };
      const options = { new: true };
      
      // Update the status of the coupon
      const coupon = await Couponsdb.findByIdAndUpdate(couponId, update, options);

      if (!coupon) {
          return res.status(404).json({ error: "Coupon not found" });
      }

      // Set the toast message based on the status change
      req.session.toastMessage = newStatus === 'active' ? "Coupon Activated!" : "Coupon Deactivated!";

      // Send response with updated coupon and message
      res.status(200).json({ coupon, message: `Status of ${coupon.name} changed` });
  } catch (error) {
      // Handle error
      res.status(500).json({ error: "Internal Server Error" });
      console.error("Coupon status change error", error);
  }
};


const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.query.id;
    if (!couponId) {
      return res.status(400).json({ error: "Coupon ID is required" });
    }

    const coupon = await Couponsdb.findByIdAndDelete(couponId);
    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    console.log("Coupon deleted");
    req.session.toastMessageDelete = "Coupon Deleted..."
    // req.session.save()
    return res.status(200)
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


module.exports = {
  loadCoupons,
  // getCouponList,
  addCoupon,
  updateCoupon,
  changeStatus,
  deleteCoupon,
}