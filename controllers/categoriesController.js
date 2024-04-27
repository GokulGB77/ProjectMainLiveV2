const Categoriesdb = require("../models/categoriesModel");
const { response } = require("../routes/userRoutes");


const loadAdmincategories = async (req, res) => {
  try {
    const categories = await Categoriesdb.find({});
    res.render("adminCategories", { categories, errorMessage: "" });
  } catch (error) {
    console.log(error);
    res.status(500).send("Category Loading Failed");
  }
}

const addCategory = async (req, res) => {
  try {
    // const existingCategory = await Categoriesdb.findOne({categoryName :req.body.categoryName })
    const categoryName = (req.body.categoryName).trim()
    const existingCategory = await Categoriesdb.findOne({ categoryName: { $regex: new RegExp('^' + categoryName + '$', 'i') } })
   
    if (existingCategory) {
      const categories = await Categoriesdb.find();
      return res.render("adminCategories", {
        categories, errorMessage: "Category already exists",
      });

    }
    const category = await Categoriesdb.create({
      categoryName: (req.body.categoryName).trim(),
      categoryDetails: (req.body.categoryDetails).trim(),
      categoryStatus: (req.body.categoryStatus).trim()
    });

    const categories = await Categoriesdb.find();
    console.log(`Category '${category.categoryName}' added successfully.`);
    return res.render("adminCategories", { categories, errorMessage: "" });
  } catch (error) {
    console.error('Error adding category:', error);
    return res.status(500).send("Category adding failed");
  }
}

const editCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const categoryClicked = await Categoriesdb.findById(id);
    const categories = await Categoriesdb.find({});

    if (!categoryClicked) {
      return res.status(404).send("Category Not Found");
    }
    console.log("Product fetched using id...", id);
    res.render("editCategory", { categoryClicked, categories, errorMessage: null });


  } catch (error) {
    console.log(error);
    res.status(500).send("Error viewing category");
  }
}

const updateCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const categoryClicked = await Categoriesdb.findById(id);
    const categoryName = (req.body.categoryName).trim()
     const existingCategory = await Categoriesdb.findOne({_id:{$ne:id} ,categoryName: { $regex: new RegExp('^' + categoryName + '$', 'i') } })
    
    if (existingCategory) {
      const categories = await Categoriesdb.find();

      return res.render("editCategory", {
        categories, categoryClicked, errorMessage: "Category already exists",
      });

    }
    const updatedCategory = await Categoriesdb.findByIdAndUpdate(id, {
      categoryName: (req.body.categoryName).trim(),
      categoryDetails: (req.body.categoryDetails).trim(),
      categoryStatus: (req.body.categoryStatus).trim()
    })
    const categories = await Categoriesdb.find({});

    console.log("Category Updated:", updatedCategory.categoryName);
    res.render("adminCategories", { categories, updatedCategory, errorMessage: "" });


  } catch (error) {
    console.log("Category Updation Failed: ", error);
    res.status(500).send("Category Updation Failed.. Try Again!!");
  }
}

const changeStatus = async (req, res) => {
  try {
      const id = req.query.id;
      const newStatus = req.query.status === '0' ? 1 : 0; // Toggle status
      
      // Assuming Categoriesdb is your category model
      const category = await Categoriesdb.findByIdAndUpdate(id, { categoryStatus: newStatus });
      const categories = await Categoriesdb.find({});

      console.log(`Category ${newStatus === 0 ? 'Disabled' : 'Enabled'}: ${category.categoryName}`);
      res.render("adminCategories", { categories, errorMessage: "" });

  } catch (error) {
      console.log("Category status change failed: ", error);
      res.status(500).send("Category status change failed");
  }
};







module.exports = {
  loadAdmincategories,
  addCategory,
  editCategory,
  updateCategory,
  changeStatus,

}