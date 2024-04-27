const Userdb = require("../models/userModel")
const Cartdb = require("../models/cartModel")
const Addressdb = require("../models/addressModel")




// Controller function to handle adding a new address
const addNewAddress = async (req, res) => {
  try {
    // Extract the address data from the request body
    const { addname, house, street, city, state, pincode, type, user, mobile, setDefault } = req.body;
    console.log("current user ID: ", user);

    // Convert empty setDefault to false
    const isDefault = setDefault === "" ? false : setDefault;

    // Create a new address object
    const newAddress = {
      name: addname,
      house,
      street,
      city,
      state,
      pincode,
      mobile,
      setDefault: isDefault,
      type: type || 'home' // Default to 'home' if type is not provided
    };

    // Check if the user already has an address document
    let existingAddress = await Addressdb.findOne({ user: user });

    if (existingAddress) {
      if (existingAddress.addresses.length >= 4) {
        // Redirect with message if the user has reached the maximum allowed addresses
        req.flash('error', 'You have reached the maximum allowed addresses.');
        return res.redirect("/profile?&SizeLimit=true#address");
      }

      // If the user already has an address document, add the new address to it
      if (isDefault) {
        // If the new address is set as default, update all other existing addresses' setDefault to false
        existingAddress.addresses.forEach(address => {
          address.setDefault = false;
        });
      }

      existingAddress.addresses.push(newAddress);
      await existingAddress.save();
    } else {
      // If the user does not have an address document, create a new one
      const address = new Addressdb({
        user: user,
        addresses: [newAddress],
      });

      existingAddress = await address.save();
    }

    // Redirect back to the profile page after adding the address
    req.flash('success', 'New address added successfully.');
    res.redirect("/profile?added=true#address");
  } catch (error) {
    // Handle errors
    req.flash('error', 'Error adding new address.');
    console.error('Error adding address:', error);
    res.redirect("/profile?notadded=true#address");
  }
};


const addAddressFrmCart = async (req, res) => {
  try {
    // Extract the address data from the request body
    const { addname, house, street, city, state, pincode, type, user, mobile, setDefault } = req.body;
    console.log("current user ID: ", user);

    // Convert empty setDefault to false
    const isDefault = setDefault === "" ? false : setDefault;

    // Create a new address object
    const newAddress = {
      name: addname,
      house,
      street,
      city,
      state,
      pincode,
      mobile,
      setDefault: isDefault,
      type: type || 'home' // Default to 'home' if type is not provided
    };

    // Check if the user already has an address document
    let existingAddress = await Addressdb.findOne({ user: user });

    if (existingAddress) {
      if (existingAddress.addresses.length >= 4) {
        // Redirect with message if the user has reached the maximum allowed addresses
        req.flash('error', 'You have reached the maximum allowed addresses.');
        return res.redirect(`/checkout?id=${cartId}&SizeLimit=true`);
      }

      // If the user already has an address document, add the new address to it
      if (isDefault) {
        // If the new address is set as default, update all other existing addresses' setDefault to false
        existingAddress.addresses.forEach(address => {
          address.setDefault = false;
        });
      }

      existingAddress.addresses.push(newAddress);
      await existingAddress.save();
    } else {
      // If the user does not have an address document, create a new one
      const address = new Addressdb({
        user: user,
        addresses: [newAddress],
      });

      existingAddress = await address.save();
    }
    const cart = await Cartdb.findOne({user:user})
    const cartId = cart._id

    // Redirect back to the profile page after adding the address
    req.flash('success', 'New address added successfully.');
    res.redirect(`/checkout?id=${cartId}&added=true`);  } catch (error) {
    // Handle errors
    req.flash('error', 'Error adding new address.');
    console.error('Error adding address:', error);
    res.redirect(`/checkout?id=${cartId}&notadded=true`);
  }
};


//Edit address page loading
const editAddress = async (req, res) => {
  try {
   
    const addressId = req.query.id;

    // Find the document where the addresses array contains an address with the specified ID
    // const addressDetails = await Addressdb.findOne({
    //   'addresses.address._id': addressId
    // });

    const addressDetails = await Addressdb.findOne({
      'addresses._id': addressId
    });
    
    // Check if the address details are found
    if (!addressDetails) {
      return res.status(404).send('Address not found');
    }
  
    const userId = addressDetails.user
    
    // Find the specific address object within the addresses array
    const addressObject = addressDetails.addresses.find(address => address._id == addressId);
    const setDefaultVal = addressObject.setDefault
    // Render the editAddress template with the found address object
    res.render('editAddress', { userId, addressObject, setDefaultVal });
  } catch (error) {
    console.error('Error fetching address details:', error);
    res.redirect('/profile#address');
  }
};



const updateAddress = async (req, res) => {
  try {
    // Extract the address data from the request body
    const { name, house, street, city, state, pincode, type, addressId, mobile, setDefault } = req.body;
    console.log("Address ID: ", addressId);
    console.log("setDefault received:", setDefault); // Log the setDefault value
   
  //   if (setDefault === 'true') {
  //     await Addressdb.updateMany({"addresses._id": {$ne: addressId},"addresses.$.setDefault": "true"}, {
  //         $set: {"addresses.$.setDefault": "false"}
  //     })
  //     .then(() => console.log("setDefault updated successfully for other addresses"))
  //     .catch(error => console.error("Error updating setDefault:", error));
  // }
    // Find the address document where the addresses array contains the address to edit
    const existingAddress = await Addressdb.findOneAndUpdate(
      { "addresses._id": addressId },
      {
        "$set": {
          "addresses.$.name": name,
          "addresses.$.house": house,
          "addresses.$.street": street,
          "addresses.$.city": city,
          "addresses.$.state": state,
          "addresses.$.pincode": pincode,
          "addresses.$.mobile": mobile,
          "addresses.$.type": type || 'home', // Default to 'home' if type is not provided
          "addresses.$.setDefault": setDefault // Update setDefault value
        }
      },
      { new: true }
    );
    console.log("Existing address updated successfully:-------",);

   if("existingAddress.setDefault"===true){
    const allOtherAddresses = await Addressdb.findOneAndUpdate(
      { "addresses._id": addressId },
      {
        "$set": {
          "addresses.$.setDefault": false // Update setDefault value
        }
      }
    );
    console.log("count of all other addresssss:-------",allOtherAddresses.length);
   }

    // console.log("Existing Address:", existingAddress);

    if (!existingAddress) {
      // Redirect with message if the address to edit is not found
      req.flash('error', 'Address not found.');
      return res.redirect("/profile?notfound=true#address",{});
    }

    // If setDefault is true, update other addresses to set setDefault as false
  
      // If the new address is set as default, update all other existing addresses' setDefault to false
      
    

    

    // Redirect back to the profile page after editing the address
    req.flash('success', 'Address updated successfully.');
    res.redirect("/profile?&edited=true#address");
  } catch (error) {
    // Handle errors
    req.flash('error', 'Error editing address.');
    console.error('Error editing address:', error);
    res.redirect("/profile/edit-address?edited=false");
  }
};




const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id; // Get the address ID from the query parameters

    // Find the address document where the user ID matches and the addresses array contains the address to delete
    const existingAddress = await Addressdb.findOne({ "addresses._id": addressId });

    if (!existingAddress) {
      // Redirect with message if the address to delete is not found
      req.flash('error', 'Address not found.');

      return res.redirect("/profile?selected=Address&notfound=true");
    }

    // Remove the address from the addresses array
    existingAddress.addresses = existingAddress.addresses.filter(address => address._id.toString() !== addressId);
    await existingAddress.save();

    // Redirect back to the profile page after deleting the address
    req.flash('success', 'Address deleted successfully.');

    res.redirect("/profile?deleted=#address");
  } catch (error) {
    // Handle errors
    req.flash('error', 'Error deleting address.');

    console.error('Error deleting address:', error);
    res.redirect("/profile&notdeleted=true#address");
  }
};







module.exports = {
  addNewAddress,
  addAddressFrmCart,
  editAddress,
  updateAddress,
  deleteAddress
};



