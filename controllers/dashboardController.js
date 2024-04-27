const Userdb = require("../models/userModel")
const Cartdb = require("../models/cartModel")
const Addressdb = require("../models/addressModel")
const Ordersdb = require("../models/ordersModel")
const Productsdb = require("../models/productsModel")
const Categoriesdb = require("../models/categoriesModel")
const Walletdb = require("../models/walletModel")
const Couponsdb = require("../models/couponsModel")
const mongoose = require("mongoose")

const loadAdminDashoard = async (req, res) => {
  try {
    const allProducts = await Productsdb.find()
    const allCategories = await Categoriesdb.find()
    const allOrders = await Ordersdb.find({ orderStatus: "delivered" });
    const allUsers = await Userdb.find({ status: 1, }).sort({ createdAt: 1 })

    const topUsers = await Ordersdb.aggregate([
      {
        $group: {
          _id: "$user",
          totalOrders: { $count: {} }
        }
      },
      {
        $sort: {
          totalOrders: -1
        }
      }
    ]);
    const userIds = topUsers.map(user => user._id);

    const users = await Userdb.find({ _id: { $in: userIds } });
    topUsers.forEach(user => {
      const userData = users.find(u => u._id.toString() === user._id.toString());
      user.name = userData.name; // Assuming the name field in Userdb is 'name'
    });

    const topProducts = await Productsdb.find().sort({ popularity: -1 }).limit(10)

    const topCategories = await Productsdb.aggregate([
      { $sort: { popularity: -1 } },
      { $limit: 10 },
      {
        $group: {
          _id: "$category",
          products: {
            $push: {
              _id: "$_id",
              productName: "$productName",
              popularity: "$popularity"
            }
          },
          totalPopularity: { $sum: "$popularity" }
        }
      }
    ])

    const categoryIds = topCategories.map(category => new mongoose.Types.ObjectId(category._id)); // Convert _id strings to ObjectId

    const categories = await Categoriesdb.find({ _id: { $in: categoryIds } });

    topCategories.forEach(categoryObj => {
      const category = categories.find(cat => cat._id.toString() === categoryObj._id.toString());
      if (category) {
        categoryObj.categoryName = category.categoryName;
      }
    });

    console.log("topCategories:", topCategories);

    const totalOrderPriceSum = allOrders.reduce((accumulator, currentOrder) => {
      const orderTotalPriceSum = currentOrder.orderProducts.reduce((productAccumulator, currentProduct) => {
        return productAccumulator + currentProduct.totalPrice;
      }, 0);
      return accumulator + orderTotalPriceSum;
    }, 0);

    console.log("Total sum of all order products' totalPrice:", totalOrderPriceSum);

    res.render("dashboard", { title: 'Admin Dashboard', allOrders, revenue: totalOrderPriceSum, allProducts, allCategories, allUsers, topUsers, topProducts,topCategories });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};


const salesStatistics = async (req, res) => {
  try {
    const filterType = req.query.filterType;
    let labels, orderCount, revenue;

    console.log("filterType:",filterType)
    switch (filterType) {
      case 'yearly':
        labels = [ '2022','2023','2024'];
        orderCount = await getYearlyCounts(2022, 2024);
        revenue = await getYearlyRevenue(2022, 2024);
        break;
      case 'monthly':
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        orderCount = await getMonthlyCounts();
        revenue = await getMonthlyRevenue();
        break;
      case 'weekly':
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
        orderCount = await getWeeklyCounts();
        revenue = await getWeeklyRevenue();
        break;
      default:
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        orderCount = await getMonthlyCounts();
        revenue = await getMonthlyRevenue();
    }
    console.log("revenue:",revenue)

    res.json({ labels, orderCount, revenue });
    
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

async function getYearlyCounts(startYear, endYear) {
  const counts = [];
  for (let year = startYear; year <= endYear; year++) {
    const count = await Ordersdb.countDocuments({
      createdAt: {
        $gte: formatDateToDatabase(`${year}-01-01`),
        $lte: formatDateToDatabase(`${year}-12-31`)
      }
    });
    counts.push(count);
  }
  return counts;
}

async function getYearlyRevenue(startYear, endYear) {
  const revenue = [];
  for (let year = startYear; year <= endYear; year++) {
    console.log(year)
    const totalRevenue = await Ordersdb.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: null,
          "totalRevenue": { $sum: "$orderTotal" }
        }
      }
    ]);
    revenue.push(totalRevenue[0]?.totalRevenue || 0);
  }
  return revenue;
}


async function getMonthlyCounts() {
  const counts = [];
  for (let month = 1; month <= 12; month++) {
    const count = await Ordersdb.countDocuments({
      createdAt: {
        $gte: formatDateToDatabase(`${new Date().getFullYear()}-${month.toString().padStart(2, '0')}-01`),
        $lte: formatDateToDatabase(`${new Date().getFullYear()}-${month.toString().padStart(2, '0')}-31`)
      }
    });
    counts.push(count);
  }
  return counts;
}

async function getMonthlyRevenue() {
  const revenue = [];
  for (let month = 1; month <= 12; month++) {

    const totalRevenue = await Ordersdb.aggregate([
      {
        $match: {
          createdAt: {
            $gte: formatDateToDatabase(`${new Date().getFullYear()}-${month.toString().padStart(2, '0')}-01`),
            $lte: formatDateToDatabase(`${new Date().getFullYear()}-${month.toString().padStart(2, '0')}-31`)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$orderTotal" }
        }
      }
    ]);
    console.log("totalRevenue:",totalRevenue)

    revenue.push(totalRevenue[0]?.totalRevenue || 0);
  }
  return revenue;
}


async function getWeeklyCounts() {
  const counts = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (startDate.getDay() || 7));
  for (let week = 0; week < 5; week++) {
    const endDate = new Date(startDate.getTime() + (6 * 24 * 60 * 60 * 1000));
    const count = await Ordersdb.countDocuments({
      createdAt: {
        $gte: formatDateToDatabase(startDate.toISOString().slice(0, 10)),
        $lte: formatDateToDatabase(endDate.toISOString().slice(0, 10))
      }
    });
    counts.push(count);
    startDate.setDate(startDate.getDate() + 7);
  }
  return counts;
}

async function getWeeklyRevenue() {
  const revenue = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (startDate.getDay() || 7));
  for (let week = 0; week < 5; week++) {
    const endDate = new Date(startDate.getTime() + (6 * 24 * 60 * 60 * 1000));
    const totalRevenue = await Ordersdb.aggregate([
      {
        $match: {
          createdAt: {
            $gte: formatDateToDatabase(startDate.toISOString().slice(0, 10)),
            $lte: formatDateToDatabase(endDate.toISOString().slice(0, 10))
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$orderTotal" }
        }
      }
    ]);
    revenue.push(totalRevenue[0]?.totalRevenue || 0);
    startDate.setDate(startDate.getDate() + 7);
  }
  return revenue;
}

function formatDateToDatabase(dateString) {
  const date = new Date(dateString);
  return date.toISOString();
}




console.log("nothing")


const loadSalesReport = async (req, res) => {
  try {
    const allProducts = await Productsdb.find()
    const allCategories = await Categoriesdb.find()
    const allOrdersCount = await Ordersdb.find({ orderStatus: "delivered" });
    const allOrders = await Ordersdb.find({ orderStatus: "delivered" }).sort({ orderDate: -1 });
    const allOrdersUnwinded = await Ordersdb.aggregate([
      { $unwind: "$orderProducts" },
      { $match: { orderStatus: "delivered" } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "productsdbs",
          localField: "orderProducts.product",
          foreignField: "_id",
          as: "orderProducts.prodDetails"
        }
      }
    ]);

    console.log("allOrdersUnwinded:", allOrdersUnwinded)

    const allUsers = await Userdb.find({ status: 1 })


    const statuses = await Ordersdb.distinct('orderStatus');

    // Calculate orderPriceWODiscount for each order
    const ordersObj = allOrders.map(order => {
      let orderPriceWODiscount = 0;
      order.orderProducts.forEach(prod => {
        orderPriceWODiscount += prod.quantity * prod.priceWithoutOffer;
      });
      return {
        ...order.toObject(), // Convert Mongoose document to plain JavaScript object
        orderPriceWODiscount: orderPriceWODiscount
      };
    });
    let totalPriceSum = 0;
    let totalPriceWithoutOfferSum = 0;

    allOrdersUnwinded.forEach(order => {
      totalPriceSum += order.orderProducts.totalPrice;
      totalPriceWithoutOfferSum += order.orderProducts.totalPriceWithoutOffer;
    });

    console.log("Total Price Sum:", totalPriceSum);
    console.log("Total Price Without Offer Sum:", totalPriceWithoutOfferSum);

    const totalOrdersAmount = allOrdersUnwinded.reduce((total, order) => {
      return total + order.orderProducts.totalPrice;
    }, 0);
    const totalOrdersCount = allOrdersUnwinded.length

    const deliveredOrders = allOrdersUnwinded.length;
    const numberOfDeliveredOrders = deliveredOrders.length;

    const couponDiscountSum = allOrders.reduce((total, order) => {
      return total + order.couponDiscount;
    }, 0);

    // console.log('Coupon Discount Sum:', couponDiscountSum);

    const offerDiscountSum = allOrdersUnwinded.reduce((total, order) => {
      const totalPriceWithoutOffer = order.orderProducts.totalPriceWithoutOffer || 0;
      return total + (totalPriceWithoutOffer - order.orderProducts.totalPrice);
    }, 0);

    // console.log('Offer Discount Sum:', offerDiscountSum);


    res.render("salesReport", {
      allOrders, allOrdersUnwinded, allProducts, totalPriceSum, totalPriceWithoutOfferSum, allCategories, allUsers, statuses, ordersObj, totalOrdersAmount, offerDiscountSum, totalOrdersCount, numberOfDeliveredOrders, couponDiscountSum,
      offerDiscountSum

    });

  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
}




const generateData = async (startDate, endDate) => {
  try {
    let endDate1 = new Date(endDate);
    endDate1.setDate(endDate1.getDate() + 1);
    endDate1 = endDate1.toISOString().slice(0, 10);

    const allProducts = await Productsdb.find();
    const allCategories = await Categoriesdb.find();
    const allOrdersCount = await Ordersdb.find({ orderStatus: "delivered" });
    const allOrders = await Ordersdb.find({ orderStatus: "delivered", "createdAt": { $gte: new Date(startDate), $lt: new Date(endDate1) } }).sort({ orderDate: -1 });
    const allOrdersUnwinded = await Ordersdb.aggregate([
      { $unwind: "$orderProducts" },
      {
        $match: {
          "createdAt": {
            $gte: new Date(startDate),
            $lt: new Date(endDate1)
          },
          "orderStatus": "delivered"
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "productsdbs",
          localField: "orderProducts.product",
          foreignField: "_id",
          as: "orderProducts.prodDetails"
        }
      }
    ]);
    const allUsers = await Userdb.find({ status: 1 });

    const statuses = await Ordersdb.distinct('orderStatus');

    const ordersObj = allOrders.map(order => {
      let orderPriceWODiscount = 0;
      order.orderProducts.forEach(prod => {
        orderPriceWODiscount += prod.quantity * prod.priceWithoutOffer;
      });
      return {
        ...order.toObject(),
        orderPriceWODiscount: orderPriceWODiscount
      };
    });

    let totalPriceSum = 0;
    let totalPriceWithoutOfferSum = 0;

    allOrdersUnwinded.forEach(order => {
      totalPriceSum += order.orderProducts.totalPrice;
      totalPriceWithoutOfferSum += order.orderProducts.totalPriceWithoutOffer;

      const productNameWords = order.orderProducts.prodDetails[0].productName.split(" ");
      const firstThreeWords = productNameWords.slice(0, 3).join(" ");
      order.orderProducts.firstThreeWords = firstThreeWords;
    });

    console.log("Total Price Sum:", totalPriceSum);
    console.log("Total Price Without Offer Sum:", totalPriceWithoutOfferSum);

    const totalOrdersAmount = allOrdersUnwinded.reduce((total, order) => {
      return total + order.orderProducts.totalPrice;
    }, 0);

    const totalOrdersCount = allOrdersUnwinded.length;

    const deliveredOrders = allOrdersUnwinded.length;
    const numberOfDeliveredOrders = deliveredOrders.length;

    const couponDiscountSum = allOrders.reduce((total, order) => {
      return total + order.couponDiscount;
    }, 0);

    const offerDiscountSum = allOrdersUnwinded.reduce((total, order) => {
      const totalPriceWithoutOffer = order.orderProducts.totalPriceWithoutOffer || 0;
      return total + (totalPriceWithoutOffer - order.orderProducts.totalPrice);
    }, 0);

    return {
      allOrders,
      allOrdersUnwinded,
      allProducts,
      totalPriceSum,
      totalPriceWithoutOfferSum,
      allCategories,
      allUsers,
      statuses,
      ordersObj,
      totalOrdersAmount,
      offerDiscountSum,
      totalOrdersCount,
      numberOfDeliveredOrders,
      couponDiscountSum,
      startDate,
      endDate,
    };

  } catch (error) {
    throw new Error(error.message);
  }
}

const generateSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    const data = await generateData(startDate, endDate);

    res.json(data);

  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
}

const fs = require('fs');
const ejs = require('ejs');
const pdfkit = require('pdfkit');
const handlebars = require('handlebars');
const puppeteer = require('puppeteer');

const generateSalesReportPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const data = await generateData(startDate, endDate);
    const totalOrdersCount = (data.totalOrdersCount).toLocaleString()
    const totalPriceWithoutOfferSum = (data.totalPriceWithoutOfferSum).toLocaleString()
    const offerDiscountSum = (data.offerDiscountSum).toLocaleString()
    const couponDiscountSum = (data.couponDiscountSum).toLocaleString()
    const totalRevenue = ((data.totalPriceSum) - (data.couponDiscountSum)).toLocaleString()

    const htmlContent = fs.readFileSync('./views/admins/salesReportPdfMain.ejs', 'utf8');
    const template = handlebars.compile(htmlContent);

    let tableContent = `
            <table class="table border my-5" style="font-size: 10px">
                <thead>
                    <tr class="bg-primary-subtle">
                        <th style="width:50px;" class="thead" scope="col">Sl.No.</th>
                        <th style="width:50px;" class="thead" scope="col">Order ID</th>
                        <th class="thead" scope="col">Product</th>
                        <th class="thead" scope="col">Order Date</th>
                        <th class="thead" scope="col">Qty</th>
                        <th class="thead" scope="col">Total Amt</th>
                        <th class="thead" scope="col">Discount</th>
                        <th class="thead" scope="col">Amt After Discount</th>
                        <th class="thead" scope="col">Payment</th>
                    </tr>
                </thead>
                <tbody>
            `;


    data.allOrdersUnwinded.forEach((order, index) => {
      let productNameWords = order.orderProducts.prodDetails[0].productName.split(" ");

      tableContent += `
            <tr>
            <td class="tbody">${index + 1}</td>
            <td class="tbody">${order.orderId}</td>
            <td class="tbody">${productNameWords.slice(0, 2).join(" ")}</td>
            <td class="tbody">${order.orderDate}</td>
            <td class="tbody">${order.orderProducts.quantity}</td>
            <td class="tbody">${(order.orderProducts.totalPriceWithoutOffer).toLocaleString()}</td>
            <td class="tbody">- ${((order.orderProducts.totalPriceWithoutOffer) - (order.orderProducts.totalPrice))}</td>
            <td class="tbody"> ${(order.orderProducts.totalPrice).toLocaleString()}</td>
            <td class="tbody"> ${order.paymentMethod}</td>
            </tr>
          `;
    })

    tableContent += `
            </tbody>
            </table>
        `;

    const renderedHtml = template({ tableContent, totalOrdersCount, totalPriceWithoutOfferSum, offerDiscountSum, couponDiscountSum, totalRevenue });
    const browser = await puppeteer.launch();
    const paged = await browser.newPage();
    const marginOptions = {
      top: '1cm',
      bottom: '1cm',
      left: '1cm',
      right: '1cm'
    };

    await paged.setContent(renderedHtml);
    const pdfBuffer = await paged.pdf({
      format: 'A4',
      margin: marginOptions
    });

    await browser.close();

    res.setHeader('Content-Disposition', 'inline; filename="Sales Report"');
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};





module.exports = {
  loadAdminDashoard,
  loadSalesReport,
  generateSalesReport,
  generateSalesReportPDF,
  salesStatistics
}