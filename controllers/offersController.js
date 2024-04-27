const Userdb = require("../models/userModel")
const Productsdb = require("../models/productsModel")
const Categoriesdb = require("../models/categoriesModel")
const Offersdb = require("../models/offersModel")
const Referraldb = require("../models/referralModel")




const loadOffers = async (req, res) => {
  try {
    const cOffers = await Offersdb.find({ "categoryOffer.discountPercentage": {  $ne: 0 } }).populate("productOffer.products").populate("categoryOffer.category")
    const categoryOffers = cOffers.categoryOffer
    
    const pOffers = await Offersdb.find({ "productOffer.discountPercentage": {  $ne: 0 } }).populate("productOffer.products").populate("categoryOffer.category")
    const productOffers = pOffers.productsOffer
    
    const rOffers = await Referraldb.find().populate("user")
    const forExistingUser = rOffers.forExistingUser
    const forNewUser = rOffers.forNewUser

    const categories = await Categoriesdb.find()
    const products = await Productsdb.find({ productOffer: { $gt: 0 } }).sort({ productName: 1 })
    const referral = await Userdb.find()


    res.render("viewOffers", { cOffers, pOffers, rOffers, categoryOffers, productOffers, rOffers, categories, products })
  } catch (error) {
    console.error('Error Loading Offers:', error);
    return res.status(500).send("Internal Server Error");
  }
}


const addCategoryOffer = async (req, res) => {
  try {
    const { title, startDate, endDate, category, discountPercentage } = req.body;
    console.log("category:",category)
    // Find products in the given category
    const productDocuments = await Productsdb.find({ category: category });

    if (!productDocuments || productDocuments.length === 0) {
      return res.status(404).json({ error: "Category not found or no products in the category" });
    }

    console.log('Category Offer Title:', title);

    // Create a new offer document
    const categoryOffer = {
      category: category,
      discountPercentage: discountPercentage
    };

    const newOffer = await Offersdb.create({
      title: title,
      startDate: startDate,
      endDate: endDate,
      categoryOffer: categoryOffer,
      productOffer: {},
    });

    // Update category offer for each product
    await Promise.all(productDocuments.map(async (product) => {
      product.categoryOffer = discountPercentage;
      await product.save();
    }));
    await applyOffers()

    // Send a response
    res.json({ message: `${newOffer} offer created successfully` });

  } catch (error) {
    console.error('Error adding category offer:', error);
    return res.status(500).send("Category offer adding failed");
  }
};

const deleteCategoryOffer = async (req, res) => {
  try {
    const categoryOfferId = req.query.id; // Assuming 'id' is the parameter name
    console.log(categoryOfferId);
    let offerDoc = await Offersdb.findByIdAndDelete(categoryOfferId);
    await applyOffers()

    res.json({ message: `Category Deelted` });
    } catch (error) {
    console.error('Error deleting category offer:', error);
    return res.status(500).send("Category deleting Failed");
}
};

const toggleCategoryOffer = async (req, res) => {
  try {
      const categoryOfferId = req.query.id; // Assuming 'id' is the parameter name
      console.log(categoryOfferId);
      let offerDoc = await Offersdb.findById(categoryOfferId);

      // Toggle the isActive status
      offerDoc.isActive = !offerDoc.isActive;

      if (!offerDoc.isActive) {
        await Productsdb.updateMany({ category: offerDoc.categoryOffer.category}, { $set:{categoryOffer: 0} });
      }
      
      await offerDoc.save();

      const message = offerDoc.isActive ? 'Category Blocked' : 'Category Unblocked';

      applyOffers()

      // Send a response
      res.json({ message: `Category ${offerDoc.isActive ? 'Blocked' : 'Unblocked'} successfully`, isActive: offerDoc.isActive , });
      } catch (error) {
      console.error('Error toggling category offer:', error);
      return res.status(500).send("Category Toggle Failed");
  }
};

const addProductOffer = async (req, res) => {
  try {
    // Extract data from the request body
    const { title, startDate, endDate, selectedProducts, discountPercentage } = req.body;
    console.log("discountPercentage:",discountPercentage)
    console.log("Type:",typeof(discountPercentage))
    // Query the database for the selected products
    const products = await Productsdb.find({ _id: { $in: selectedProducts } });
    const discountPercentageInt =  parseFloat(discountPercentage)
    // Check if products were found
    if (!products || products.length === 0) {
      return res.status(404).json({ error: "Products not found" });
    }

    // Log the title of the product offer
    console.log('Products Offer Title:', title);

    // Construct the product offer object
    const productOffer = {
      applicableProducts: selectedProducts, // Use selectedProducts array
      discountPercentage: discountPercentageInt
    };

    // Create a new offer document
    const newOffer = await Offersdb.create({
      title: title,
      startDate: startDate,
      endDate: endDate,
      productOffer: productOffer,
      categoryOffer: {} // Assuming you have categoryOffer data, adjust as needed
    });

    // Update prices of products in the offer
    await Promise.all(products.map(async (product) => {
      // Update the product offer information
      product.productOffer = discountPercentageInt

      // Save the product changes
      await product.save();
    }));

    // Send a response
    await applyOffers()

    res.json({ message: `${newOffer} offer created successfully` });

  } catch (error) {
    console.error('Error adding product offer:', error);
    return res.status(500).send("Product offer adding failed");
  }
}



const applyForAProduct = async (req, res) => {
  try {
    const { productId, offerPercentage } = req.body;
    const product = await Productsdb.findById(productId);

    if (!product) {
      return res.status(404).send({ message: "Product not found" });
    }

    product.productOffer = offerPercentage;
    await product.save();

    // Construct the product offer object
    const productOffer = {
      applicableProducts: [productId], // Apply the offer to a single product
      discountPercentage: offerPercentage
    };

    // Create a new offer document
    const newOffer = await Offersdb.create({
      title: `Offer for Product ID: ${productId}`, // You can adjust the title as needed
      startDate: new Date(), // Assuming the offer starts immediately
      endDate: null, // Assuming no end date for this offer
      productOffer: productOffer,
      categoryOffer: {} // Assuming you have categoryOffer data, adjust as needed
    });
    await applyOffers()
    res.status(200).send({ message: "Product offer applied", product: product, offer: newOffer });
  } catch (error) {
    console.error('Error applying offer:', error);
    return res.status(500).send("Error applying offer");
  }
}

const addReferralOffer = async (req,res) => {
  try {
    const {referredUserReward, referringUserReward} = req.body
    const referralOfferId = "660d56e89e4bab2266e5b138"
    const referralOffer = await Referraldb.findById(referralOfferId)
   
    referralOffer.forExistingUser = referredUserReward
    referralOffer.forNewUser = referringUserReward
    await referralOffer.save()
    res.status(200).json({referralOffer});

  } catch (error) {
    console.error('Error adding referral offer:', error);
    return res.status(500).send("Error adding referral offer");
  }
}
const getReferralOffer = async (req, res) => {
  try {
    const referralOffer = await Referraldb.findOne();
    if (!referralOffer) {
      // If no offer exists, create a new one
      const newReferralOffer = await Referraldb.create({
        forExistingUser: 0,
        forNewUser: 0
      });
      // Return the newly created offer
      return res.status(200).json(newReferralOffer);
    }

    // If an offer exists, extract the rewards
    const { forExistingUser, forNewUser } = referralOffer;
    res.status(200).json({ forExistingUser, forNewUser });
  } catch (error) {
    console.error('Error getting referral offer:', error);
    return res.status(500).send("Error getting referral offer");
  }
};

const generateReferralCode = async (req, res) => {
  try {
    const userId = req.body.userId; 
    const user = await Userdb.findById(userId); 

    const referralCode = generateCode(5);

    user.referralCode = referralCode;

    await user.save(); // 

    res.status(200).send({ referralCode: referralCode });
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}

function generateCode(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const validateReferralCode = async (req, res) => {
  try {
    const referralCode = req.body.referralCode;
    const user = await Userdb.findOne({ referralCode: referralCode });
    if (user) {
      res.status(200).send({ valid: true, message: "Referral code is valid" });
    } else {
      res.status(200).send({ valid: false, message: "Referral code is invalid" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}





const applyOffers = async (req, res) => {
  
    console.log("Applying Offers")
    // const productsWithProductOffer = await Productsdb.find({ productOffer: { $gt: 0 } });
    const productsWithOffer = await Productsdb.find({ productOffer: { $gt: 0 } });
    // const productsWithCategoryOffer = await Categoriesdb.find({ categoryOffer: { $gt: 0 } });

    console.log("products:", productsWithOffer.length);
    // console.log("Categories:", categoriesWithOffer.length);
    productsWithOffer.forEach(product => {

      if (product.productOffer > product.categoryOffer) {
        console.log("productOffer is higher than category Offer")
        const productPrice = product.productPrice;
        const offerPercentage = product.productOffer;
        const offerPrice = (productPrice * (1 - (offerPercentage / 100))); 
        const roundedOfferPrice = Math.round(offerPrice / 100) * 100; 
        product.offerPrice = roundedOfferPrice
        console.log("Offer price for product:", roundedOfferPrice);
      } else {
        console.log("categoryOffer is higher than productOffer")
        const productPrice = product.productPrice; 
        const offerPercentage = product.categoryOffer; 
        const offerPrice = (productPrice * (1 - (offerPercentage / 100))); 
        const roundedOfferPrice = Math.round(offerPrice / 100) * 100; 
        product.offerPrice = roundedOfferPrice
        console.log("Offer price for product:", roundedOfferPrice);
      }
      product.save()
    });
    console.log("Offers Applied")

  
}





module.exports = {
  loadOffers,
  addCategoryOffer,
  addProductOffer,
  applyForAProduct,
  toggleCategoryOffer,
  deleteCategoryOffer,
  getReferralOffer,
  addReferralOffer,
  generateReferralCode,
  validateReferralCode,
  applyOffers,
}