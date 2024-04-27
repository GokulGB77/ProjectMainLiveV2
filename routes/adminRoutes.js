const express = require('express');
const adminRoute = express();
const session = require('express-session');
const { v4:uuidv4 } = require('uuid');  
const adminController = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');
const productsController = require('../controllers/productsController');
const categoriesController = require('../controllers/categoriesController');
const ordersController = require('../controllers/ordersController');
const couponsController = require('../controllers/couponsController');
const offersController = require('../controllers/offersController');
const multer = require("multer")
const sharp = require('sharp'); // Import sharp for image cropping



const adminAuth = require('../middleware/adminAuth')
const path = require("path")
adminRoute.use(express.static(path.join(__dirname, 'public')));

adminRoute.use(session({
  secret: uuidv4(),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, // Set secure to true if using HTTPS
  })); 



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/productAssets/");
  },
  filename: (req, file, cb) => {
    const uniqueFilename =
      file.fieldname + "_" + uuidv4() + path.extname(file.originalname);
    cb(null, uniqueFilename);
  },
});
const upload = multer({ storage: storage });


adminRoute.set('view engine','ejs');
adminRoute.set('views','./views/admins')



adminRoute.get('/',adminController.loadAdminLogin);
adminRoute.get('*',adminAuth.isAdmin);
adminRoute.post('/dashboard',adminController.verifyAdminLogin);
adminRoute.get('/sales-statistics',dashboardController.salesStatistics);
adminRoute.get('/dashboard',dashboardController.loadAdminDashoard);
adminRoute.get('/sales-report',dashboardController.loadSalesReport);
adminRoute.post('/generate-sales-report',dashboardController.generateSalesReport);
adminRoute.post('/generate-sales-report-pdf',dashboardController.generateSalesReportPDF);
// adminRoute.post('/generate-pdf',dashboardController.generateSalesReportPDF);
// adminRoute.get('/generate-pdf',dashboardController.generateSalesReportPdf);

adminRoute.get('/user-details',adminController.userDetails)
adminRoute.get('/user-details-fetch',adminController.userDetailsFetch)
adminRoute.get("/user-details/change-status",adminController.changeStatus)

adminRoute.get("/products",productsController.loadAdminProducts);
adminRoute.get("/products1",productsController.loadAdminProducts1);
adminRoute.get("/products/add-product",productsController.loadAddProduct)
adminRoute.post("/products/add-product",upload.array("productImage", 4),productsController.addProduct)

adminRoute.get("/products/edit-product",productsController.editProduct)
adminRoute.post("/products/edit-product",productsController.updateProduct)

adminRoute.get("/products/change-status",productsController.changeStatus)

adminRoute.get("/categories",categoriesController.loadAdmincategories)
adminRoute.post("/categories/add-category",categoriesController.addCategory)
adminRoute.get("/categories/edit-category",categoriesController.editCategory)
adminRoute.post("/categories/edit-category/update",categoriesController.updateCategory)

adminRoute.get("/categories/change-status",categoriesController.changeStatus)

adminRoute.get("/orders",ordersController.loadOrders)
adminRoute.get("/orders1",ordersController.loadOrders1)
adminRoute.get("/orders/order-details",ordersController.loadOrdersDetails)
adminRoute.post("/change-order-status",ordersController.changeOrderStatus)
adminRoute.post("/orders/order-details/save-notes",ordersController.adminCancel)
adminRoute.post("/approve-refund", ordersController.approveRefund);

adminRoute.get("/coupons",couponsController.loadCoupons)
// adminRoute.get("/admin/coupons/list",couponsController.getCouponList)
adminRoute.post("/coupons",couponsController.addCoupon)
adminRoute.post("/coupons/update",couponsController.updateCoupon)
adminRoute.get("/coupons/change-status",couponsController.changeStatus)
adminRoute.delete("/coupons/delete-coupon",couponsController.deleteCoupon)

adminRoute.get("/offers",offersController.loadOffers)
adminRoute.get("/apply-offers",offersController.applyOffers)
adminRoute.post("/add-category-offer",offersController.addCategoryOffer)
adminRoute.get("/toggle-category-offer",offersController.toggleCategoryOffer)
adminRoute.get("/delete-category-offer",offersController.deleteCategoryOffer)
adminRoute.post("/add-product-offer",offersController.addProductOffer)
adminRoute.post("/apply-product-offer",offersController.applyForAProduct)
adminRoute.get("/get-referral-offer",offersController.getReferralOffer)
adminRoute.post("/add-referral-offer",offersController.addReferralOffer)

adminRoute.post("/generate-referral-code",offersController.generateReferralCode)
adminRoute.post("/validate-referral-code",offersController.validateReferralCode)

adminRoute.get("/logout", adminController.adminLogout);



module.exports = adminRoute ;