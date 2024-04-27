const Categoriesdb = require("../models/categoriesModel");
const Couponsdb = require("../models/couponsModel");
const Productsdb = require("../models/productsModel")
const Userdb = require("../models/userModel")
const Cartdb = require("../models/cartModel")
const Addressdb = require("../models/addressModel")
const MAX_CART_QUANTITY = 10;
const taxRate =18/100; //Current Gst rate for Furnitures in India
const deliveryCharge = 500; // default delivery charge value

const addToCart = async (req, res) => {
  try {
    const productId = req.body.productId.trim();
    const userId = req.session.userId;

    const userDetails = await Userdb.findById(userId);
    const productDetails = await Productsdb.findById(productId).populate("category");
    const currentStock = productDetails.stock;
    let priceWithoutOffer = productDetails.productPrice
    let pPrice;
    if (productDetails.productOffer !== 0 || productDetails.categoryOffer !== 0) {
      pPrice = productDetails.offerPrice;
    } else {
      pPrice = productDetails.productPrice;
    }
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
        cart.cartProducts[existingProductIndex].totalPriceWithoutOffer = cart.cartProducts[existingProductIndex].priceWithoutOffer * cart.cartProducts[existingProductIndex].quantity;
      }
    } else {
      // If the product doesn't exist, add it to the cart with quantity 1
      cart.cartProducts.push({
        product: productDetails,
        quantity: 1, // Initialize quantity to 1
        price: pPrice,
        priceWithoutOffer: priceWithoutOffer,
        totalPrice: pPrice, // Initialize total price to price of a single product
        totalPriceWithoutOffer: priceWithoutOffer,
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

    const Qty = await Cartdb.findOne({ user: userId })
    const cartQty = Qty.cartProducts.length

    res.status(200).json({ cartQty, message: "Product added to cart successfully" });
  } catch (error) {
    console.error("Error Adding Product To Cart: ", error);
    res.status(500).json({ error: "Error adding product to cart" });
  }
}

const loadCart = async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log("userId:req.session.userId:--", userId)
    const addressDocument = await Addressdb.findOne({ user: userId });
    const addresses = addressDocument ? addressDocument.addresses : [];
    if (!userId) {
      // Handle case where userId is missing in the query parameters
      return res.status(400).json({ error: "User ID is required." });
    }

    const cart = await Cartdb.findOne({ user: userId }).populate("cartProducts.product");
    if (cart) {
      cart.cartTotal = cart.cartProducts.reduce((total, item) => total + item.totalPrice, 0);
      // let deliveryCharge = 500
      const Total = cart.cartTotal;
      // const Total = cart.cartTotal + deliveryCharge; //delivery charge replaced


      if (!cart) {
        // Handle case where cart is not found for the provided userId
        return res.render("cart", { userId, cart: { cartProducts: [] }, index: 0 });
      }

      return res.render("cart", { userId, Total, addresses, cart, index: 0 });
    }
    return res.render("cart", { userId, addresses, cart, index: 0 });

  } catch (error) {
    console.error("Error Loading Cart: ", error);
    res.status(500).json({ error: "Error Loading Cart." });
  }
};

const updateCartQuantity = async (req, res) => {
  const { productId, cartId, quantity } = req.body;

  try {
    // Find the cart by its ID
    const cart = await Cartdb.findById(cartId);

    // Find the index of the product in the cartProducts array
    const productIndex = cart.cartProducts.findIndex(item => item.product.toString() === productId);

    if (productIndex !== -1) {
      // If the product is found in the cartProducts array, update its quantity
      cart.cartProducts[productIndex].quantity = quantity;
      // Update totalPrice based on the new quantity
      cart.cartProducts[productIndex].totalPrice = cart.cartProducts[productIndex].price * quantity;
    } else {
      // If the product is not found in the cartProducts array, push a new item
      // Assuming you have access to product price here
      const product = await Productsdb.findById(productId);
      cart.cartProducts.push({
        product: productId,
        quantity: quantity,
        price: product.productPrice,
        totalPrice: product.productPrice * quantity,
      });
    }

    // Update the totalPrice for all products in the cart
    cart.cartProducts.forEach(item => {
      item.totalPrice = item.price * item.quantity;
    });

    // Calculate the new cartTotal based on the updated cartProducts array
    cart.cartTotal = cart.cartProducts.reduce((total, item) => total + item.totalPrice, 0);

    // Save the updated cart to the database
    await cart.save();

    // Prepare the response with updated subtotal and total values
    const productSubtotal = cart.cartProducts.find(item => item.product.toString() === productId).totalPrice;
    const cartTotal = cart.cartTotal;
    // let deliveryCharge = 500
    const Total = cart.cartTotal;
    // const Total = cart.cartTotal + deliveryCharge; //delivery charge replaced

    res.status(200).json({ message: 'Cart updated successfully', productSubtotal, cartTotal, Total });
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const checkProductStock = async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    // Find the product by ID
    const product = await Productsdb.findById(productId);

    // Check if product exists and has enough stock
    if (product && product.stock >= quantity) {
      res.json({ enoughStock: true });
    } else {
      res.json({ enoughStock: false });
    }
  } catch (error) {
    console.error('Error checking product stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const removeCartProduct = async (req, res) => {
  const { productId, cartId } = req.body;

  try {
    // Find the cart by its ID
    const cart = await Cartdb.findById(cartId);

    // Check if the cart exists
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the index of the product in the cartProducts array
    const productIndex = cart.cartProducts.findIndex(item => item.product.toString() === productId);

    if (productIndex !== -1) {
      // If the product is found in the cartProducts array, remove it
      cart.cartProducts.splice(productIndex, 1);

      // Recalculate the cart total based on the updated cartProducts array
      cart.cartTotal = cart.cartProducts.reduce((total, item) => total + item.totalPrice, 0);

      // Save the updated cart to the database
      await cart.save();

      // Redirect the user to a specified page
      res.status(200).json({ message: "Product Removed From Cart", cartProductsCount: cart.cartProducts.length }); // Change '/cart' to the desired page URL
    } else {
      // If the product is not found in the cartProducts array, send an error response
      res.status(404).json({ message: 'Product not found in the cart' });
    }
  } catch (error) {
    // Handle errors
    console.error('Error removing product from cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const removeAllCartProducts = async (req, res) => {
  const { id } = req.query;

  try {
    // Find the cart by its ID
    const cart = await Cartdb.findById(id);

    // Check if the cart exists
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Set cartProducts array to empty
    cart.cartProducts = [];

    // Reset cart total to 0
    cart.cartTotal = 0;

    // Save the updated cart to the database
    await cart.save();

    // Redirect the user to a specified page
    res.redirect('/cart'); // Change '/cart' to the desired page URL
  } catch (error) {
    // Handle errors
    console.error('Error removing all products from cart:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const cartCount = async (req, res) => {
  try {
    const userId = req.query.user;
    // Assuming Cartdb is your Mongoose model for the cart
    const cart = await Cartdb.findOne({ user: userId });

    if (!cart) {
      // If cart is not found, return 0 as the count
      res.json({ count: 0 });
      return;
    }

    // Assuming cartProducts is an array field in your Cart schema
    const cartCount = cart.cartProducts.length;
    // console.log("cart count is:", cartCount);

    // Send the cart count as a JSON response
    res.json({ count: cartCount });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    // Send an error response if there's an error fetching the cart count
    res.status(500).json({ error: 'Failed to fetch cart count' });
  }
};

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.userId;
    const addresses = await Addressdb.findOne({ user: userId });
    
    let addresslist = addresses.addresses.reverse();
    const cardId = req.query.id;
    const cart = await Cartdb.findById(cardId).populate("cartProducts.product");
    //  console.log("Cart with populated products:", cart); // Log the cart to see if products are populated correctly

    if (!cart) {
      return res.status(400).send("Error getting cart details");
    }
    const coupons = await Couponsdb.find({ status: "active" })

    const couponCode = cart.couponApplied
    const coupon = await Couponsdb.findOne({name:couponCode})

    if (cart.cartTotal + (cart.cartTotal*taxRate) + deliveryCharge > 5000) {
      req.session.disableCOD = true;
  } else {
      req.session.disableCOD = false;
  }
    return res.render("checkout", { cart, userId, addresslist, cardId, coupon, coupons,taxRate,deliveryCharge }); 
  } catch (error) {
    console.error('Error Loading CheckoutPage', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

const applyCoupon = async (req, res) => {
  try {
    const { cartId, couponCode } = req.body; 


    const cart = await Cartdb.findById(cartId).populate("cartProducts.product");

    if (!cart) {
      throw new Error("Cart Not Found");
    }
    const coupon = await Couponsdb.findOne({ code: couponCode });
    if (!coupon) {
      let responseData = { message: "Invalid Coupon Code" }
      return res.status(200).json({ responseData });
    }
   
    const couponType = coupon.discountType;
    const couponId = coupon._id;
    const couponValue = coupon.discountValue;
    const couponMinAmt = coupon.minimumOffer;
    const couponMaxAmt = coupon.maximumOffer;
    const cartTotal = cart.cartTotal;

    if (couponType == "percentage") {
      if (cartTotal >= couponMinAmt) {
        const couponDiscount = cartTotal * (couponValue / 100);
        if (couponDiscount <= couponMaxAmt) {
          cart.couponDiscount = couponDiscount;
        } else {
          cart.couponDiscount = couponMaxAmt;
        }
      }
    } else {
      const couponDiscount = couponValue;
      if (couponDiscount <= couponMaxAmt) {
        cart.couponDiscount = couponDiscount;
      } else {
        cart.couponDiscount = couponMaxAmt;
      }
    }
    const taxAmount = (cart.cartTotal - cart.couponDiscount) * taxRate

    responseData = {
      message: "Coupon applied successfully",
      couponCode: couponCode,
      couponId: couponId,
      discountAmount: cart.couponDiscount,
      totalAmount: cart.cartTotal + taxAmount + deliveryCharge - cart.couponDiscount ,
      taxAmount:taxAmount
    };
    cart.couponApplied = couponCode

    await cart.save();
    req.session.couponApplied = coupon.code;
   
    res.status(200).json({ responseData,cart });
  } catch (error) {
    console.error('Error Applying Coupon:', error.message);
    res.status(500).json({ message: 'Internal server error' }); 
  }
};

const removeCoupon = async (req, res) => {
  try {
    const { cartId, couponCode } = req.body; 
   
    const cart = await Cartdb.findById(cartId).populate("cartProducts.product");

    if (!cart) {
      throw new Error("Cart Not Found");
    }
    cart.couponApplied = null;
    cart.couponDiscount = 0;
    const taxAmount = (cart.cartTotal - cart.couponDiscount) * taxRate
    responseData = {
      message: "Coupon removed",
      totalAmount: cart.cartTotal + taxAmount + deliveryCharge - cart.couponDiscount ,
      taxAmount:taxAmount
    };
    await cart.save();
    res.status(200).json({ responseData });
  } catch (error) {
    console.error('Error Applying Coupon:', error.message); 
    res.status(500).json({ message: 'Internal server error' }); 
  }
};


module.exports = {
  addToCart,
  cartCount,
  loadCart,
  updateCartQuantity,
  checkProductStock,
  removeCartProduct,
  removeAllCartProducts,
  loadCheckout,
  applyCoupon,
  removeCoupon,
}