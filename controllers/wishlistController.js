const Productsdb = require("../models/productsModel")
const Userdb = require("../models/userModel")
const Cartdb = require("../models/cartModel")
const Wishlistdb = require("../models/wishlistModel");
const MAX_CART_QUANTITY = 10;


const addToWishlist = async (req, res) => {
  try {
    const productId = req.body.productId;
    const userId = req.session.userId;

    const userDetails = await Userdb.findById(userId);
    const productDetails = await Productsdb.findById(productId).populate("category");
    const currentStock = productDetails.stock;
    let pPrice;
    if(productDetails.productOffer !==0 || productDetails.categoryOffer !==0  ){
       pPrice = productDetails.offerPrice;
    } else {
       pPrice =  productDetails.productPrice;
    }

    let wishlist = await Wishlistdb.findOne({ user: userId });
    console.log("Wishlist Found");
    if (!wishlist) {
      // If wishlist doesn't exist, create a new one
      wishlist = await Wishlistdb.create({
        user: userId,
        wishlistItems: [],       
      });
    }

    // Check if the product already exists in the wishlist
    const existingProduct = wishlist.wishlistItems.findIndex(item => item.product && item.product.equals(productId));

    if (existingProduct !== -1) {
      return res.status(400).json({ message: "Product already exists in the wishlist" });
    } else {
      // Add the product to the wishlist
      wishlist.wishlistItems.push({
        product: productId,
        price: pPrice,
      });
    }

    await wishlist.save();

    res.status(200).json({  message: "Product added to wishlist" });
  } catch (error) {
    console.error("Error Adding Product To Wishlist: ", error);
    res.status(500).json({ error: "Error Adding Product To Wishlist" });
  }
}
const loadwishlist = async (req, res) => {
  try {
    const userId =  req.query.user
    const wishlist = await Wishlistdb.findOne({user:userId}).populate("wishlistItems.product");
    console.log("userId:",userId)
    console.log("WISHLIST:",wishlist)
    res.render("wishlist",{userId,wishlist})
  } catch (error) {
    console.log(error.message);
  }
}

const addToCart = async (req, res) => {
  try {
    const productId = req.body.productId;
    console.log("productId:",productId)
    console.log("productId type:",typeof(productId))
    const userId = req.session.userId;

    const productDetails = await Productsdb.findById(productId).populate("category");
    console.log("ProductDEtails:",productDetails)
    if (!productDetails) {
      return res.status(404).json({ error: "Product not found" });
    }

    const currentStock = productDetails.stock;
    const pPrice = productDetails.productPrice;

    // Find the user's wishlist and remove the product from it
    const wishlist = await Wishlistdb.findOneAndUpdate(
      { user: userId },
      { $pull: { wishlistItems: { product: productId } } },
      { new: true }
    );

    let cart = await Cartdb.findOne({ user: userId });
    console.log("Cart Found");
    if (!cart) {
      // If cart doesn't exist, create a new one
      cart = await Cartdb.create({
        user: userId,
        cartProducts: [],
        cartTotal: 0,
      });
    }

    // Calculate total quantity of the product in the cart
    const productInCartQuantity = cart.cartProducts.reduce((total, item) => {
      if (item.product && item.product.equals(productId)) {
        return total + item.quantity;
      }
      return total;
    }, 0);
    console.log("Calculate total quantity of the product in the cart");
    // Check if adding the product would exceed the available stock
    if (productInCartQuantity >= currentStock) {
      return res.status(405).json({ error: "Cannot add more of this product, insufficient stock available" });
    }

    // Check if adding the product would exceed the maximum quantity limit
    let cartQuantity = 0;
    cart.cartProducts.forEach(item => {
      cartQuantity += item.quantity;
    });

    if (cartQuantity >= MAX_CART_QUANTITY) {
      return res.status(401).json({ error: "Cart already contains the maximum quantity limit" });
    }

    const existingProductIndex = cart.cartProducts.findIndex(item => item.product && item.product.equals(productId));

    if (existingProductIndex !== -1) {
      // If the product exists in the cart, increase its quantity by 1
      const newQuantity = cart.cartProducts[existingProductIndex].quantity + 1;
      cart.cartProducts[existingProductIndex].quantity = newQuantity;
      // Update total price if quantity is more than 1
      if (cart.cartProducts[existingProductIndex].quantity > 1) {
        cart.cartProducts[existingProductIndex].totalPrice = cart.cartProducts[existingProductIndex].price * cart.cartProducts[existingProductIndex].quantity;
      }
    } else {
      // If the product doesn't exist, add it to the cart with quantity 1
      cart.cartProducts.push({
        product: productDetails,
        quantity: 1, // Initialize quantity to 1
        price: pPrice,
        totalPrice: pPrice, // Initialize total price to price of a single product
      });
    }

    // Calculate cart total
    cart.cartProducts.forEach(item => {
      item.totalPrice = item.price * item.quantity;
    });

    // Calculate the new cartTotal based on the updated cartProducts array
    cart.cartTotal = cart.cartProducts.reduce((total, item) => total + item.totalPrice, 0);

    // Save the updated cart to the database
    await cart.save();

    const Qty = await Cartdb.findOne({ user: userId });
    const cartQty = Qty.cartProducts.length;

    res.status(200).json({ cartQty, message: "Product added to cart successfully" });
  } catch (error) {
    console.error("Error Adding Product To Cart: ", error);
    res.status(500).json({ error: "Error adding product to cart" });
  }
};

const removeWishlistItem = async (req, res) => {
  const { productId, wishlistId } = req.body;

  try {
      const wishlist = await Wishlistdb.findById(wishlistId).populate('wishlistItems.product');

      if (!wishlist) {
          return res.status(404).json({ message: 'Wishlist not found' });
      }

      // Find the index of the wishlist item with the specified product ID
      const itemIndex = wishlist.wishlistItems.findIndex(item => item.product._id.toString() === productId);

      if (itemIndex !== -1) {
          // If the item is found, remove it from the wishlist
          wishlist.wishlistItems.splice(itemIndex, 1);
          await wishlist.save();

          // Successful removal
          return res.status(200).json({ message: 'Product removed from wishlist successfully',wishlistCount: wishlist.wishlistItems.length });
      } else {
          // Product not found in the wishlist
          return res.status(404).json({ message: 'Product not found in the wishlist' });
      }
  } catch (error) {
      // Handle internal server error
      console.error('Error removing product from wishlist:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};



module.exports = {
  addToWishlist,
  loadwishlist,
  addToCart,
  removeWishlistItem
}
