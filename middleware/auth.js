const jwt = require("jsonwebtoken");
const tokenExpiry = 3 * 24 * 60 * 60;
const Userdb = require("../models/userModel");
const secretKey = process.env.JWT_SECRET;

const createToken = (id) => {
  return jwt.sign({id},secretKey, {
    expiresIn: tokenExpiry,
  })
}



const isLogin = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (token) {
      jwt.verify(token, secretKey, (err, decodedToken) => {
        if (err) {
          console.log(err.message);
          res.redirect('/logout');
        } else {
          console.log("Decoded JWT Token:",decodedToken);
          next();
        }
      });
    } else {
      res.redirect('/logout');
    }
  } catch (error) {
    console.log(error.message);
    // If there's an error, pass it to the next middleware
    next(error);
  }
}


// middleware.js

const attachTokenToLocals = (req, res, next) => {
  res.locals.token = req.cookies.jwt || null; 
  next();
};



const isUser = async (req, res, next) => {
  const token = req.cookies.jwt;
  res.locals.token = req.cookies.jwt || null;

  if (token) {
    jwt.verify(token, secretKey, async (err, decodedToken) => {
      if (err) {
        console.error("JWT Verification Error:", err.message);
        res.locals.currentUser = null;
        next(); // Proceed to the next middleware
      } else {
        try {
          const user = await Userdb.findById(decodedToken.id);
          if (user) {
            req.session.userId = user._id; // Set userId in the session
            if (user.status === 1) {
              res.locals.currentUser = user;
              res.locals.currentUserId = user._id;
              req.session.currentUser = user;
              req.session.currentUserId = user._id;
              req.session.save();
              next(); // Proceed to the next middleware
            } else {
              console.error("User is blocked");
              res.clearCookie('jwt'); // Clear JWT cookie
              return res.redirect('/login?error=blocked');
            }
          } else {
            console.error("User not found");
            res.locals.currentUser = null;
            next(); // Proceed to the next middleware
          }
        } catch (userError) {
          console.error("User Lookup Error:", userError.message);
          res.locals.currentUser = null;
          next(); // Proceed to the next middleware
        }
      }
    });
  } else {
    // No token found, proceed to the next middleware
    res.locals.currentUser = null;
    next();
  }
}







// const isLogout = async (req,res) => {

// }

module.exports= { 
  createToken,
  isLogin, 
  isUser,
  attachTokenToLocals,
  // isLogout,
}