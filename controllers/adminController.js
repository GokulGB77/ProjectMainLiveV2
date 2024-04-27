const Admindb = require("../models/userModel")
const auth = require("../middleware/auth")
const argon2 = require('argon2');



const loadAdminLogin = async (req,res)=>{
  try {
    const jwtcookie = req.cookies.adminjwt;
    if(jwtcookie){
      return res.redirect("/admin/dashboard")
    } 
    console.log("adminLogin rendered");
    const successMessage = "You have successfully logged out."
    res.render('adminLogin')
  } catch (error) {
    console.log(error.message)
  }
}


const verifyAdminLogin = async (req, res) => {
  try {
      const { email, password } = req.body;

      console.log("req.body.email:", email);
      console.log("req.body.password:", password);

      const adminData = await Admindb.findOne({ email });

      console.log("adminData:", adminData);

      if (adminData) {
          const passwordMatch = await argon2.verify(adminData.password, password);

          console.log("Password Verifying......");

          if (passwordMatch && adminData.is_admin === 1) {
              console.log("Password Matched..............");

              const userID = adminData._id;

              console.log(adminData.name);

              const token = auth.createToken(userID);

              console.log("admin token:", token);

              res.cookie("adminjwt", token, {
                  httpOnly: true,
                  tokenExpiry: auth.tokenExpiry * 1000,
              });

              return res.status(200).json({ redirect: '/admin/dashboard' });
          } else if (adminData.is_admin === "0") {
              return res.status(403).json({ error: "You do not have permission to access the admin panel." });
          } else {
              return res.status(400).json({ error: "Email and Password is Incorrect" });
          }
      } else {
          console.log("User not Found!!!");
          return res.status(404).json({ error: "User not found" });
      }
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ error: "Internal Server Error" });
  }
};


const adminLogout = async (req, res) => {
  try {
    res.cookie('adminjwt', '', { expires: new Date(0) },()=>{
      console.log("adminjwt token destroyed");
    });
    console.log("Admin logged out");
    return res.redirect("/admin")
    
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Logout failed");
  }
};


const userDetails = async (req,res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    
    const users = await Admindb.find({})
    .sort({_id:-1})
    .skip(startIndex)
    .limit(limit);


    const totalUsers = await Admindb.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);
    res.render("userDetails",{users,currentPage:page,totalPages})

  } catch (error) {
    console.log(error);
    res.status(500).send("User Details failed to fetch");
  }
}
const userDetailsFetch = async (req,res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    
    const users = await Admindb.find({})
    .sort({_id:-1})
    .skip(startIndex)
    .limit(limit);


    const totalUsers = await Admindb.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);
    res.status(200).json({users,currentPage:page,totalPages});

  } catch (error) {
    console.log(error);
    res.status(500).send("User Details failed to fetch");
  }
}

const changeStatus = async (req, res) => {
  try {
      const id = req.query.id;
      const newStatus = req.query.status === '0' ? 1 : 0; // Toggle status
      const user = await Admindb.findByIdAndUpdate(id, { status: newStatus });
      const users = await Admindb.find({});
      
      console.log(`User ${user.name} status changed to ${newStatus === 0 ? 'unblocked' : 'blocked'}`);
      res.render("userDetails", { users });
  } catch (error) {
      console.log(error);
      res.status(500).send("Status change failed");
  }
};







module.exports = {
  loadAdminLogin,
  userDetails,
  userDetailsFetch,
  verifyAdminLogin,
  adminLogout,
  changeStatus,
  
}