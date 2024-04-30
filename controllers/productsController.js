const Userdb = require("../models/userModel")
const Productsdb = require("../models/productsModel")
const Categoriesdb = require("../models/categoriesModel");
const sharp = require('sharp'); // Import sharp for image cropping
const path=require('path')



const loadAdminProducts = async (req, res) => {
  try {
    // Get the current page from the query parameter
    const currentPage = parseInt(req.query.page) || 1;
    const limit = 10; // Number of products to display per page

    // Calculate the start and end index for the current page
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;

    // Fetch the products for the current page
    const products = await Productsdb.find({})
      .sort({ productName: 1 })
      .skip(startIndex)
      .limit(limit);

    // Get the total number of products
    const totalProducts = await Productsdb.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / limit);

    // Check if any products were found
    if (!products || products.length === 0) {
      throw new Error('Product Not Found');
    }

    // Render the viewProducts template with the necessary data
    res.render('viewProducts', {
      products: products,
      currentPage: currentPage,
      page: currentPage,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error('Error loading Product List page:', error.message);
    res.status(500).send('Error loading Product List page');
  }
};

const loadAdminProducts1 = async (req, res) => {
  try {
    // Get the current page from the query parameter
    const currentPage = parseInt(req.query.page) || 1;
    const limit = 10; // Number of products to display per page

    // Calculate the start and end index for the current page
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;

    // Fetch the products for the current page
    const products = await Productsdb.find({})
      .sort({ productName: 1 })
      .skip(startIndex)
      .limit(limit);

    // Get the total number of products
    const totalProducts = await Productsdb.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalProducts / limit);

    // Check if any products were found
    if (!products || products.length === 0) {
      throw new Error('Product Not Found');
    }

    // Render the viewProducts template with the necessary data
    res.json( {
      products: products,
      currentPage: currentPage,
      totalPages: totalPages,
    });
  } catch (error) {
    console.error('Error loading Product List page:', error.message);
    res.status(500).send('Error loading Product List page');
  }
};


const getCategories = async (req, res) => {
  try {
    const categories = await Categoriesdb.find({}, "categoryName").sort({ categoryName: 1 });
    return categories;
  } catch (error) {
    console.error("Get category from database failed: ", error);
    throw error;
  }
};

const loadAddProduct = async (req, res) => {
  try {
    const categories = await getCategories();
    console.log("Add product page loadedd...");
    res.render("addProduct", { categories });
  } catch (error) {
    console.log("Error loading Product Add page: ", error.message);
  }
};



const addProduct = async (req, res) => {
  try {
    // const uploadedImages = req.files.map((file) => file.filename);

    // const removedImages = req.body.removeImage || [];
    // const imagesToKeep = uploadedImages.filter((image) => !removedImages.includes(image));
    const fileNames = req.files.map(file=>file.filename)

    let image = []
         
      for(let file of req.files){
        const randomInteger = Math.floor(Math.random() * 20000001)
    
        const outputPath1=path.join(__dirname,"../public/productAssets/","crop"+file.filename)
        const outputPath2 = "crop"+file.filename
        console.log("imgPath",outputPath1);
        const croppedImage = await sharp(file.path)
        .resize(1000,1000,{
            fit:"fill",
        })  
        .toFile(outputPath1)
         image.push(outputPath2)
      }
    let productTags;
    if (req.body.productTags) {
      productTags = req.body.productTags.split(",").map((tag) => tag.trim());
    } else {
      productTags = [];
    }

    const newProduct = new Productsdb({
      productName: req.body.productName,
      stock: req.body.stock,
      images: image , // Only save the images that are not removed
      productDetails: req.body.productDetails,
      productInfo: req.body.productInfo,
      productPrice: req.body.productPrice,
      status: req.body.status,
      productTags: productTags,
      category: req.body.productCategory,
    });

    await newProduct.save();
    // await newProduct.populate('category', 'categoryName').execPopulate();

    console.log("New Product Added..........");
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error Saving Product Data: ", error);
    res.status(500).send("Error Saving Product Data");
  }
};


const editProduct = async (req, res) => {
  try {
    console.log("Edit Product Page Loaded");
    const id = req.query.id
    const product = await Productsdb.findOne({ _id: id }).populate("category");


    if (!product) {
      return res.status(404).send("Product Not Found");
    }
    console.log("Product fetched using id...", id);
    const categories = await getCategories();

    res.render("editProduct", { product, categories })

  } catch (error) {
    console.log(error)
    res.status(500).send("Error editing product");


  }
}

const updateProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const exstingData = await Productsdb.findById(id)
    // console.log("Existing dattaa.............",exstingData);
    const updatedProductDetails = {
      productName: req.body.productName,
      stock: req.body.stock,
      productDetails: req.body.productDetails,
      productInfo: req.body.productInfo,
      productPrice: req.body.productPrice,
      status: req.body.status,
      category: req.body.productCategory,
    };
    // console.log("Product details updated:",updatedProductDetails);

    if (req.body.productTags) {
      updatedProductDetails.productTags = req.body.productTags.split(",").map(tag => tag.trim());
    } else {
      updatedProductDetails.productTags = [];
    }

    if (req.files && req.files.length > 0) {
      const uploadedImages = req.files.map((file) => file.filename);
      updatedProductDetails.images = uploadedImages;
    }

    const UpdatedDetails = await Productsdb.findByIdAndUpdate(id, updatedProductDetails).populate("category");
    console.log(UpdatedDetails.category.categoryName);
    console.log("Product details updated..........");
    // res.redirect("/admin/products");
    res.status(200).json({message:"Updated Success"})
  } catch (error) {
    console.log(error);
    res.status(500).send("Update Product Details Failed.......");
  }
};

const changeStatus = async (req, res) => {
  try {
      const id = req.query.id;
      const currentPage = req.query.page;
      const newStatus = req.query.status === '0' ? 1 : 0; // Toggle status
      const limit = 10; // Number of products to display per page

      // Calculate the start and end index for the current page
      const startIndex = (currentPage - 1) * limit;
      const endIndex = startIndex + limit;
      const totalProducts = await Productsdb.countDocuments();

      // Calculate the total number of pages
      const totalPages = Math.ceil(totalProducts / limit);

      const product = await Productsdb.findByIdAndUpdate(id, { status: newStatus });
      const products = await Productsdb.find({}).sort({ productName: 1 });
      
      console.log(`Product ${newStatus === 0 ? 'Unarchived' : 'Archived'}: ${product.productName}`);
      res.render("viewProducts", { products, currentPage, totalPages });
  } catch (error) {
      console.log(error);
      res.status(500).send("Status change failed");
  }
};





const loadShop = async (req, res) => {
  try {
    const userId = res.locals.currentUserId ? res.locals.currentUserId._id : null;
    const perPage = 12;
    const page = parseInt(req.query.page) || 1;
    const currentUser = await Userdb.findById(userId);

    // Extract filter criteria from query parameters
    const filterByCategories = req.query.category ? req.query.category.split(',') : null;
    const filterByPrice = req.query.price ? req.query.price.split(',') : null;
    const filterByOutOfStock = req.query.outOfStock === 'true'; // Check if 'outOfStock' is true

    // Construct filter object based on filter criteria
    const filter = {};
    if (filterByCategories) {
      filter["category"] = { $in: filterByCategories };
    }
    if (filterByPrice) {
      const [minPrice, maxPrice] = filterByPrice;
      filter.productPrice = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
    }
    if (filterByOutOfStock) {
      filter.stock = { $gt: 0 }; // Filter for out of stock products
    }
    
    // Adding search criteria to the filter object
    const searchQuery = req.query.search ? req.query.search.trim() : null;
    if (searchQuery) {
      filter.$or = [
        { productName: { $regex: new RegExp(searchQuery, 'i') } },
        { productDescription: { $regex: new RegExp(searchQuery, 'i') } },
        { "category.categoryName": { $regex: new RegExp(searchQuery, 'i') } },
      ];
    }

    // Retrieve sorting criteria from query parameters
    const sortBy = req.query.sortBy || 'default';
    let sort;
    switch (sortBy) {
      case 'A-Z':
        sort = { productName: 1 };
        break;
      case 'Z-A':
        sort = { productName: -1 };
        break;
      case 'Price high to low':
        sort = { productPrice: -1 };
        break;
      case 'Price low to high':
        sort = { productPrice: 1 };
        break;
      case 'latest':
        sort = { createdAt: -1 };
        break;
      default:
        sort = null;
    }

    // Perform database query with server-side pagination, filtering, and sorting
    const query = Productsdb.find(filter)
      .populate({ path: 'category', select: 'categoryName' })
      .sort(sort)
      .skip((page - 1) * perPage)
      .limit(perPage);

    const allItems = await query;
    const totalCount = await Productsdb.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / perPage);
    const allCategories = await Categoriesdb.find();

    // Render view with paginated items, pagination metadata, and filter criteria
    res.render("shop", {
      currentUser,
      allItems,
      totalPages,
      currentPage: page,
      totalCount,
      allCategories,
      perPage,
      sortBy,
      filterByCategories,
      filterByPrice,
      userId,
      filterByOutOfStock,
      searchQuery // Add search query to pass it to the view
    });
  } catch (error) {
    console.error("Failed to load shop page: ", error);
    res.status(500).json({ error: `Failed to load shop page: ${error.message}` });
  }
}


const loadProductDetails = async (req, res) => {
  try {
    const userId = res.locals.currentUserId;

    const id = req.query.id
    const relatedProducts = await Productsdb.find({ _id: { $ne: id } }).populate("category").limit(4)

    const product = await Productsdb.findById(id).populate("category");
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.render("productDetails", { product, relatedProducts, userId })
  } catch (error) {
    console.log(error.message)
    res.status(500).send("Internal Server Error");

  }
}


const getSearchSuggestions = async (req, res) => {
  try {
    const partialQuery = req.query.query;
    if (!partialQuery) {
      return res.status(400).json({ error: 'Missing search query' });
    }

    // Query the database for suggestions based on the partial query
    const regex = new RegExp(partialQuery, 'i');
    const suggestions = await Productsdb.find({ productName: { $regex: regex } }).limit(5);

    // Extract the product names from the suggestions
    const suggestionNames = suggestions.map(product => product.productName);

    res.json(suggestionNames);
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({ error: 'An error occurred while fetching search suggestions' });
  }
};

module.exports = { getSearchSuggestions };



module.exports = {
  loadAdminProducts,
  loadAdminProducts1,
  loadAddProduct,
  addProduct,
  editProduct,
  updateProduct,
  changeStatus,
  loadShop,
  getCategories,
  loadProductDetails,
  getSearchSuggestions,
}