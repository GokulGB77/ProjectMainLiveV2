const Userdb = require("../models/userModel")
const Productsdb = require("../models/productsModel")
const Addressdb = require("../models/addressModel")
const Ordersdb = require("../models/ordersModel")
const Walletdb = require("../models/walletModel")
const Cartdb = require("../models/cartModel")
const Referraldb = require("../models/referralModel")
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');


const sendMail = require("../services/sendMail")
const { generateOTP } = require("../services/genereateOtp");
const sendEmailOtp = require("../services/sendMail");
const send_otp = require("../services/sendMail");
const { request } = require("../routes/userRoutes");
const auth = require("../middleware/auth");
const { devNull } = require("os");



const securePassword = async (password) => {
  try {
    const passwordHash = await argon2.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}

const loadRegister = async (req, res) => {
  try {
    const userId = res.locals.currentUserId ? res.locals.currentUserId._id : null;

    const jwtcookie = req.cookies.jwt;
    if (jwtcookie) {
      return res.redirect("/")
    }
    res.render('register', { layout: false, currentPage: 'register', userId })
  } catch (error) {
    console.log(error.message)
  }
}

const intialRegisterUser = async (req, res) => {
  try {

    const spassword = await securePassword(req.body.password);
    const referralCode = req.body.referralCode
    //Check if the email or mobile number already exists in the database
    const existingUser = await Userdb.findOne({ $or: [{ email: req.body.email }, { mobile: req.body.mobile }] });
    if (existingUser) {
      return res.render('register', { message: "Email or mobile number already exists. Please use a different one." });
    }

    const OTP = generateOTP()
    const otpExpirationTime = 2 * 60 * 1000; // 5 * 60 * 1000 = 5 minutes in milliseconds

    req.session.tempUserDetails = {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: spassword,
      is_admin: 0,
      is_verified: 0,
      status: 0,
      otp: OTP,
      // Adding expiration time
      otpExpiration: otpExpirationTime,
      referralCode: referralCode

    };
    console.log(referralCode)
    req.session.save()
    if (req.session.tempUserDetails) {
      const subject = "Verify Your CouchCart. Account"

      console.log(OTP);
      const html = `<p> Your verification code is: ${OTP} </p>`
      await sendEmailOtp(req.body.email, subject, html);
      console.log("First otp is: " + OTP);

      res.render("otpVerify", { errorMessage: null });


      setTimeout(() => {
        // Clear the OTP from the session
        req.session.tempUserDetails.otp = null;
        req.session.tempUserDetails.otpExpiration = null;
        req.session.save()
        console.log('First OTP expired');
      }, otpExpirationTime);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const resendOtp = async (req, res) => {
  try {
    const OTP = generateOTP();
    const newOtpExpiration =  2 * 60 * 1000; // 5 * 60 * 1000 = 5 minutes in milliseconds


    // Update the OTP in the session data
    req.session.tempUserDetails.otp = OTP;
    req.session.otpExpiration = newOtpExpiration
    req.session.save()

    const { email } = req.session.tempUserDetails;
    const subject = "Resend OTP for CouchCart Account";

    const html = `<p>Your new verification code is: ${OTP}</p>`;

    // Resend the OTP via email
    await sendEmailOtp(email, subject, html);
    console.log("New otp is: " + OTP);

    // res.render("otpVerify", { errorMessage: null }); // Render the OTP verification page
    res.status(200)
    setTimeout(() => {
      // Clear the OTP from the session
      req.session.tempUserDetails.otp = null;
      req.session.tempUserDetails.newOtpExpiration = null;
      req.session.save()
      console.log('New OTP expired');
    }, newOtpExpiration);


  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const registerUser = async (req, res) => {
  try {
    if (req.body.otp === req.session.tempUserDetails.otp) {

      const user = new Userdb({
        name: req.session.tempUserDetails.name,
        email: req.session.tempUserDetails.email,
        mobile: req.session.tempUserDetails.mobile,
        password: req.session.tempUserDetails.password,
        is_admin: 0,
        is_verified: 1,
      });
      const userData = await user.save();
      console.log("new userData saved to db")
      //Verifying referral code
      const referralCode = req.session.tempUserDetails.referralCode;
      const referredByUser = await Userdb.findOne({ referralCode: referralCode })
      console.log("referredByUser:", referredByUser)
      if (referredByUser) {
        console.log("Referal code exist", referralCode)
        userData.is_referred = 1
        userData.save()


        const referralOfferDoc = "660d56e89e4bab2266e5b138"
        const referralOffer = await Referraldb.findById(referralOfferDoc)
        console.log("referralOfferDoc found")
        const forExistingUser = referralOffer.forExistingUser
        const forNewUser = referralOffer.forNewUser

        const newUserWallet = await Walletdb.create({
          user: userData._id,
          balance: 0,
          transactions: []
        });
        console.log("newUser wallet created", newUserWallet)

        const existingUserWallet = await Walletdb.findOne({ user: referredByUser._id });
        // const newUserWallet = await Walletdb.findById(userData._id)
        console.log("existingUserWallet id", referredByUser._id)
        console.log("existingUserWallet accessed", existingUserWallet)


        if (typeof forExistingUser === 'number' && !isNaN(forExistingUser)) {
          existingUserWallet.balance += forExistingUser;
          existingUserWallet.transactions.push({
            amount: forExistingUser,
            description: "Referral Bonus For Referring " + userData.name,
            type: "Referral Credit"
          });
        } else {
          throw new Error('Invalid value for forExistingUser');
        }

        if (typeof forNewUser === 'number' && !isNaN(forNewUser)) {
          newUserWallet.balance += forNewUser;
          newUserWallet.transactions.push({
            amount: forNewUser,
            description: "Referral Bonus From " + referredByUser.name,
            type: "Referral Credit"
          });
        } else {
          throw new Error('Invalid value for forNewUser');
        }

        await existingUserWallet.save()
        await newUserWallet.save()
        console.log("both wallets updated")

        const referralDataDoc = await Referraldb.findOne({ user: referredByUser._id })
        if (!referralDataDoc) {
          const referralDataDoc = await Referraldb.create({
            user: referredByUser._id,
            referredUsersIds: []
          })
        }
        referralDataDoc.referredUsersIds.push(userData._id)
        await referralDataDoc.save();

      }





      const userID = userData._id;
      const token = auth.createToken(userID);
      res.cookie("jwt", token, {
        httpOnly: true,
        tokenExpiry: auth.tokenExpiry * 1000,
      });

      console.log("userId is :", userData._id);
      console.log("token :", token);
      res.status(200).json({ userId: userID });
    } else {
      res.status(400).json({});
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const registerUserGoogle = async (req, res) => {
  try {
    res.render("homepage")
  } catch (error) {
    console.log(error.message);
  }
}
const loadLogin = async (req, res) => {
  try {
    const userId = res.locals.currentUserId ? res.locals.currentUserId._id : null;

    const jwtcookie = req.cookies.jwt;
    if (jwtcookie) {
      return res.redirect("/")
    }
    const { error } = req.query
    let errorMessage = '';

    switch (error) {
      case 'blocked':
        errorMessage = 'User is blocked';
        break;
      case 'usernotfound':
        errorMessage = 'User Not Found';
        break;
      case 'invalid':
        errorMessage = 'Invalid Credentials';
        break;
      default:
        errorMessage = '';
    }


    return res.render('login', { error, errorMessage, userId });
  } catch (error) {
    console.log(error.message);
  }
}

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userData = await Userdb.findOne({ email });

    if (!userData) {
      return res.redirect('/login?error=usernotfound');
    }

    const status = userData.status;
    if (!status) {
      return res.redirect('/login?error=blocked');
    }

    const isPasswordValid = await argon2.verify(userData.password, password);
    if (!isPasswordValid) {
      return res.redirect('/login?error=invalid');
    }

    const userID = userData._id;
    res.locals.currentUser = userID
    console.log("res.locals.currentUser saved", userID)


    const token = auth.createToken(userID);
    res.cookie("jwt", token, {
      httpOnly: true,
      tokenExpiry: auth.tokenExpiry * 1000,
    });
    let cart = await Cartdb.findOne({ user: userID });
    console.log("Cart Found");
    if (!cart) {
      // If cart doesn't exist, create a new one
      cart = await Cartdb.create({
        user: userId,
        cartProducts: [],
        cartTotal: 0,

      });
    }
    console.log("User logged in...", "User Name: ", userData.name);
    return res.redirect('/home');
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}



const loadResetPass = async (req, res) => {
  try {
    const userId = res.locals.currentUserId ? res.locals.currentUserId._id : null;
    return res.render('resetPassword', { userId });
  } catch (error) {
    console.error("Reset password load Error:", error);
    return res.status(500).json({ message: 'Reset password load Error' });
  }
}

const findUser = async (req,res) => {
  try {
    const email = req.body.email;
    console.log("Email:", email)
    const user = await Userdb.findOne({ email: email });
    if (!user) {
      throw new Error("User Not Found")
      // return res.status(404).json({errorMessage:"User Not Found"})
    }
    return res.status(200)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ errorMessage: error.message });

  }
}

const verifyEmailAndSendOtp = async (req, res) => {
  try {
    const email = req.body.email;
    console.log("Email:", email)
    const user = await Userdb.findOne({ email: email });
    if (!user) {
      throw new Error("User Not Found")
      // return res.status(404).json({errorMessage:"User Not Found"})
    }
    console.log("User Found:", user)

    const OTP = generateOTP()
    const otpExpirationTime = 30000;
    console.log("Otp generated:", OTP)

    req.session.tempDetails = {
      email: req.body.email,
      otp: OTP,
      otpExpiration: otpExpirationTime,
    }
    // req.session.save()
    console.log("tempDetails:", req.session.tempDetails)
    if (!req.session.tempDetails) {
      throw new Error("Saving to session failed")
    }

    const subject = "Reset Password OTP For Your CouchCart. Account"

    console.log(OTP);
    const html = `<p> Your verification code is: ${OTP} </p>`
    await sendEmailOtp(req.body.email, subject, html);
    console.log("Reset first otp is: " + OTP);
    // setTimeout(() => {
    //   req.session.tempDetails.otp = null;
    //   req.session.tempDetails.otpExpiration = null;
    //   req.session.save()
    //   console.log('First OTP expired');
    // }, otpExpirationTime);

    return res.status(200).json({ errorMessage: "User Found", user })


  } catch (error) {
    console.error("Email Verification Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ errorMessage: error.message });
    }
    // If a response has already been sent, log the error and let the request end
    console.error("Error occurred after response sent to client:", error);
  }
}

const verifyOtpAndLoadPassInput = async (req, res) => {
  try {
    console.log("Loading password input...");
    const otp = req.body.otp;
    const tempDetails = req.session.tempDetails;
    const sessionOtp = tempDetails.otp;
    console.log(tempDetails);
    if (otp !== sessionOtp) {
      throw new Error("Invalid OTP");
    }
    console.log("Rendering password field...");
    return res.status(200).json({ message: "OTP verified, render password input field" });
  } catch (error) {
    console.error("Email Verification Error:", error);
    return res.status(500).json({ message: 'Invalid OTP' });
  }
};


const submitNewPass = async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    // Hash the password
    const spassword = await securePassword(password);
    console.log("Password hashed successfully");

    // Update user's password in the database
    const user = await Userdb.findOneAndUpdate({ email: email }, { $set: { password: spassword } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return a success response
    return res.redirect("/login");
  } catch (error) {
    console.error("Error submitting new password:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const loadHomePage = async (req, res) => {
  try {

    const userId = res.locals.currentUser
    const currentUser = res.locals.currentUser
    console.log("Userid:", userId);
    console.log("currentUser:", currentUser);
    const token = req.cookies.jwt ? true : false;
    const tokenId = req.cookies.jwt
    res.locals.token = tokenId;
    console.log("User logged in:", tokenId);
    try {
      // const categoryLiving = await Productsdb.find({category:"Living Room Furniture"}).populate("category")
      const products = await Productsdb.find({ status: 1 }).populate("category")
      const allItems = await Productsdb.find({ status: 1 }).populate("category").sort({ _id: 1 }).limit(16);
      const newArrivals = await Productsdb.find({ status: 1 }).populate("category").sort({ _id: -1 }).limit(16);
      const bestSellers = await Productsdb.find({ status: 1 }).populate("category").sort({ productName: 1 }).limit(16);
      const saleItems = await Productsdb.find({ status: 1 }).populate("category").sort({ productName: -1 }).limit(16);
      res.render('homepage', { tokenId, newArrivals, allItems, bestSellers, saleItems, products, userId, currentUser })

    } catch (error) {
      console.log("Error getting product data from db:", error)
      res.status(404).send("Error getting product data from db")
    }


  } catch (error) {
    console.log(error.message);
  }
}

const loadAboutUs = async (req, res) => {
  try {
    res.render("about-us")
  } catch (error) {
    console.log(error.message);
  }
}

const loadContactUs = async (req, res) => {
  try {
    res.render("contact-us")
  } catch (error) {
    console.log(error.message);
  }
}



const loadProfile = async (req, res) => {
  try {
    // console.log("User entered User profile");
    const token = req.cookies.jwt;
    // const currentUser = res.locals.currentUser;
    const currentUser = req.session.currentUser;
    const userId = currentUser._id;

    // Check if the user has a wallet, if not, create one
    let wallet = await Walletdb.findOne({ user: userId });
    if (!wallet) {
      // Create a wallet for the user
      wallet = await Walletdb.create({ user: userId, balance: 0, transactions: [] });
    }

    // Order related
    const ordersPerPage = 10; // Number of orders to display per page
    const currentPage = parseInt(req.query.page) || 1; // Get the current page from the query parameters, or use 1 as the default
    const totalOrders = await Ordersdb.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalOrders / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const orderDetails = await Ordersdb.find({ user: userId })
      .sort({ orderDate: -1 })
      .skip(startIndex)
      .limit(ordersPerPage);

    // User details
    const user = await Userdb.findOne({ _id: currentUser._id }).populate('addresses');
    const addressDocument = await Addressdb.findOne({ user: currentUser._id }).sort({ _id: 1 });
    let addresses = addressDocument ? addressDocument.addresses : [];
    addresses = addresses.reverse();
    const referralCode = user.referralCode;

    if (token) {
      res.render("profile", {
        token,
        currentUser,
        addresslist: addresses,
        user,
        userId,
        orderDetails,
        wallet,
        referralCode,
        currentPage,
        totalPages,
      });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("LoadProfile failed");
  }
};
const loadProfile1 = async (req, res) => {
  try {
    // console.log("User entered User profile");
    const token = req.cookies.jwt;
    const currentUser = res.locals.currentUser;
    const userId = currentUser._id;

    // Check if the user has a wallet, if not, create one
    let wallet = await Walletdb.findOne({ user: userId });
    if (!wallet) {
      // Create a wallet for the user
      wallet = await Walletdb.create({ user: userId, balance: 0, transactions: [] });
    }

    // Order related
    const ordersPerPage = 10; // Number of orders to display per page
    const currentPage = parseInt(req.query.page) || 1; // Get the current page from the query parameters, or use 1 as the default
    const totalOrders = await Ordersdb.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalOrders / ordersPerPage);
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const orderDetails = await Ordersdb.find({ user: userId })
      .sort({ orderDate: -1 })
      .skip(startIndex)
      .limit(ordersPerPage);

    // User details
    const user = await Userdb.findOne({ _id: currentUser._id }).populate('addresses');
    const addressDocument = await Addressdb.findOne({ user: currentUser._id }).sort({ _id: 1 });
    let addresses = addressDocument ? addressDocument.addresses : [];
    addresses = addresses.reverse();
    const referralCode = user.referralCode;

    if (token) {
      res.status(200).json({
        token,
        currentUser,
        addresslist: addresses,
        user,
        userId,
        orderDetails,
        wallet,
        referralCode,
        currentPage,
        totalPages,
      });
    } else {
      res.status(404);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("LoadProfile failed");
  }
};

const loadOrders = async (req, res) => {

  try {
    // console.log("User entered User profile");
    const token = req.cookies.jwt;
    const currentUser = res.locals.currentUser;
    const userId = currentUser._id


    const allOrders = await Ordersdb.find({ user: userId }).sort({ orderDate: -1, orderTime: -1 })
    console.log("orderDetails", allOrders);

    const user = await Userdb.findOne({ _id: currentUser._id }).populate('addresses');





    if (token) {
      res.render("viewUserOrders", { token, currentUser, user, userId, allOrders });
    } else {
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("LoadProfile failed");
  }
};



const updateDetails = async (req, res) => {
  try {

    const newName = req.body.name;
    const newMobile = req.body.newMobile
    const id = req.query.id
    console.log(newName, newMobile, id);
    const updateDb = await Userdb.findByIdAndUpdate(id, {
      name: newName,
      mobile: newMobile,
    })
    console.log("User Details Updated");
    res.redirect("/profile?success=true")

  } catch (error) {
    console.log(error)
    res.redirect("/profile?success=false")
  }

}



const changePassword = async (req, res) => {
  try {
    const { currentPwd, newPwd, user1 } = req.body;
    const currentUser = user1; // Assuming currentUser is the username or ID of the current user
    const isUser = await Userdb.findById(currentUser);
    console.log("currentPwd:", currentPwd);
    console.log("currentUser:", user1);
    console.log("isUser:", true);

    if (!isUser) {
      return res.status(404).send("User not found");
    }
    const samePassword = await argon2.verify(isUser.password, newPwd)
    if (samePassword) {
      return res.redirect("/profile?samepass=true#change-password")

    }
    // Verify if the current password matches the user's password
    const isPasswordMatch = await argon2.verify(isUser.password, currentPwd);
    console.log("Passwrod matched with existing password:");

    if (!isPasswordMatch) {
      return res.redirect("//profile?currentpwd=false#change-password")
    }

    // Hash the new password
    const hashedNewPwd = await securePassword(newPwd);
    console.log("hashedNewPwd", hashedNewPwd)
    // Update the user's password
    isUser.password = hashedNewPwd;
    await isUser.save();

    console.log("Password Updated Successfully");
    return res.redirect("/profile?updated=true")
  } catch (error) {
    console.log(error);
    res.redirect("/profile?window=change-password&updated=false")
  }
};

const logoutUser = async (req, res) => {
  try {
    console.log("User logged out..Session Destroyed");
    const token = req.cookies.jwt

    // Clear the JWT token from cookies
    res.cookie('jwt', '', { expires: new Date(0) });
    res.redirect("/login",);

  } catch (error) {
    console.log(error);
    res.status(500).send("Logout User Failed")
  }
};

const googleSignIn = async (req, res) => {
  try {
      const email = req.user.email;
      let userData = await Userdb.findOne({ email: email });
      console.log("userData:",userData);

      if (userData) {
        req.session.userId = userData._id; // Set userId in the session
        if (userData.status === 1) {
          res.locals.currentUser = userData;
          res.locals.currentUserId = userData._id;
          req.session.currentUser = userData;
          req.session.currentUserId = userData._id;
          req.session.save();
        } else {
          console.error("User is blocked");
          return res.redirect('/login?error=blocked');
        }
      } else {
        console.error("User not found");
        res.locals.currentUser = null;
      }
      if (!userData) {
          let nameFromG = req.user.name
          const user = new Userdb({
              name: nameFromG.givenName + " "+ nameFromG.familyName,
              email: req.user.email,
              is_admin: 0,
              is_verified: 1,
              is_google_auth:1,
              status:1
          })
          userData = await user.save()

      }

      const userID = userData._id;
      const token = auth.createToken(userID);
      res.cookie("jwt", token, {
        httpOnly: true,
        tokenExpiry: auth.tokenExpiry * 1000,
      });

      console.log("google sign in userId is :", userData._id);
      console.log("google sign in token :", token);

      res.redirect('/');
  } catch (error) {
      console.log(error.message);
  }
}






module.exports = {
  securePassword,
  loadRegister,
  loadLogin,
  loadResetPass,
  findUser,
  verifyEmailAndSendOtp,
  verifyOtpAndLoadPassInput,
  submitNewPass,
  loadHomePage,
  intialRegisterUser,
  registerUserGoogle,
  registerUser,
  loginUser,
  loadProfile,
  loadProfile1,
  loadOrders,
  resendOtp,
  logoutUser,
  updateDetails,
  changePassword,
  loadAboutUs,
  loadContactUs,
  googleSignIn

}









































// const loadAboutUs = async (req,res)=>{
//   try {
//     res.render("about-us")
//   } catch (error) {
//     console.log(error.message);
//   }
// }

// const loadContactUs = async (req,res)=>{
//   try {
//     res.render("contact-us")
//   } catch (error) {
//     console.log(error.message);
//   }
// }















