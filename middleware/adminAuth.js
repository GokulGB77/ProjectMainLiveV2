const jwt = require('jsonwebtoken');
const Admindb = require("../models/userModel")
require('dotenv').config();


const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {}
    else{
      res.redirect('/admin')
    }
    next();
  } catch (error) {
    console.log(error.message);
  }
}

const isLogout =  (req, res, next) => {
  try {
    if (req.session.user_id) {
      res.redirect('/admin/home')
    }
    next();
  } catch (error) {
    console.log(error.message);
  }
}

// const isAdmin = (req, res, next) => {
//   const token = req.cookies.adminjwt;
//   if (token) {
//     jwt.verify(token, "secret", (err, decodedToken) => {
//       if (err) {
//        res.redirect("/admin/login");
//       } else {
       
//         next();
//       }
//     });
//   } else {
//     res.redirect("/admin/login");
//   }
// };

const isAdmin = async (req, res, next) => {
  try {
      // Extract the token from the cookie
      const token = req.cookies.adminjwt;

      if (!token) {
          return res.status(401).json({ message: 'Unauthorized' });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("decoded:",decoded)

      // Check if the decoded token contains necessary data
      if (!decoded) {
          return res.status(401).json({ message: 'Unauthorized' });
      }

      // Retrieve user from the database
      const user = await Admindb.findById(decoded.id);
      console.log("user:",user)
      if (!user || user.is_admin !== 1) {
          return res.status(403).json({ message: 'Forbidden' });
      }

      // If the user is an admin, proceed to the next middleware or route handler
      next();
  } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ message: 'Unauthorized' });
  }
};



module.exports={
  isLogin,
  isLogout,
  isAdmin
}