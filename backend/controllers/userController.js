"use strict";

const

  User = require("../models/user"),
  passport = require("passport"),
  jwt= require('jsonwebtoken'),
  bcrypt = require("bcrypt"),
  ObjectId = require('mongoose').Types.ObjectId,
  fs = require('fs'),
  path = require('path'),

  // This function is reused throughout the controller to organize user attributes
  // in one object. You should create the same functions for your other model controllers.
  getUserParams = body => {
    return {
           
            fullName:    req.body.fullName,
            email:       req.body.email,
            password:    req.body.password,
            ide:         req.body.ide,
            phoneNumber: req.body.phoneNumber,
            role:        req.body.role,
            image:       req.file.path 
      };};

  process.env.TOKEN_KEY = "Sergio";
  process.env.TOKEN_EXPIRY = new Date().setDate(new Date().getDate() + 1)

// Export object literal with all controller actions.
module.exports = {

register: async(req, res) => {

       console.log("Estoy en userController - line 35 - register - req.body.uemail: "+req.body.email)
       console.log("Estoy en userController - line 36 - register - req.body.uemail: "+req.body) 

          if (!(req.body.uemail && req.body.userpass)) {
            return res.status(400).json({ message: 'Email and password not present' })
        }
        const { uemail, userpass } = req.body;

        const emailExists = await User.exists({ uemail })


        if (emailExists) {
            return res.status(400).json({ message: 'Email already exits' })}

        const newUser = new User(req.body);
        newUser.save()

        return res.status(200).json(newUser)
        },
// login action
       login: async(req, res) => {
            const { uemail, userpass } = req.body;

            const user = await User.findOne({ uemail })
            if (!user) {
                return res.status(409).json({ message: "User does not exists" })
            }
            if (!(user.userpass == userpass)) {
                return res.status(409).json({ message: 'Incorrect userpass' })
            }
            const token = jwt.sign({ user_id: user._id }, process.env.TOKEN_KEY, { expiresIn: process.env.TOKEN_EXPIRY }, );
            // save user token
            user.token = token;

            let data=user;

            res.json( data );
        },

// Add a Action to handle GET requests to the GETALLUSERS option
GETALLUSERS : async (req, res) => {
  console.log("Im at usercontroller - line 73 - GETALLUSERS ")  
  try {
    // Finds bookings that have a valid maintenance status (excluding 'None')
    const allusers = await User.find({
    })
    .sort({ updatedAt: -1 }) // Sort by latest updated requests first
    .limit(12);              // Restrict result count to 12

    console.log("Im at usercontroller - line 81 - GETALLUSERS - allusers.length: " + allusers.length)
    return res.status(200).json({
      success: true,
      data: allusers
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching users data",
      error: error.message
    });
  }
},



// Add a route to handle GET requests to the USEREMAILCHECK option
GETUSEREMAILCHECK: (req, res) => {
  console.log(req.params.uemail);
  User.find({ uemail: req.params.uemail })
  .then(data => {
     // Send saved data to the next then code block.
     // Store the user data on the response and call the next middleware function.
     {res.json(data);}
  })
  // Log error messages and redirect to the home page.
  .catch(error => {
    res.status(403).json("Error in Finding the Doc");
  });},
  // Add a action to handle GET requests to the GETUSERBYID option

  GETUSERBYID: (req, res) => {
    // when use id as parameter the seek action IT MUST BE
    // findByID - and not Only "find" - it wont send back Data to front End
    // using find only ---- SO IMPORTANT ********
    console.log(req.params.userid);
    User.findById({ _id: req.params.userid })
    .then(data => {
       // Send saved data to the next then code block.
       // Store the user data on the response and call the next middleware function.
       console.log("Estoy en userController - GETUSERBYID - line 122 -data:"+data)
       {res.json(data)}
    })
    // Log error messages and redirect to the home page.
    .catch(error => {
      res.status(403).json("Error in Finding the Doc");
    });},

  // Add a route to handle put requests to the GetUserByIdAndUpdate option

  GetUserByIdAndUpdate: (req, res) => {
    //console.log("Estoy en GetUserByIdAndUpdate - line 132 - req.body.image: "+req.body.image);
    //console.log("estoy en GetUserByIdAndUpdate - findByIdAndUpdate - line 133 -req.params.id:"+req.params.userid)
    let newId = req.params.userid;
    //console.log("estoy en GetUserByIdAndUpdate - findByIdAndUpdate - line 135 newId:"+newId)
    //console.log("estoy en GetUserByIdAndUpdate - findByIdAndUpdate - line 136 req.body.ide:"+req.body.ide)
    //console.log("estoy en GetUserByIdAndUpdate - findByIdAndUpdate - line 137 req.body.phoneNumber:"+req.body.phoneNumber)


    if(!ObjectId.isValid(req.params.userid)){
    return res.status(400).send('No record with given Id ');}
      var userData = {
            fullName:    req.body.fullName,
            email:       req.body.email,
            password:    req.body.password,
            ide:         req.body.ide,
            phoneNumber: req.body.phoneNumber,
            role:        req.body.role,
            image:       req.body.image
    };
    console.log("estoy en GetUserByIdAndUpdate - findByIdAndUpdate - line 151 -req.params.id:"+req.params.userid)
    console.log("estoy en GetUserByIdAndUpdate - findByIdAndUpdate - line 152 -req.body.fullName:"+req.body.fullName)
    // Use findByIdAndUpdate to locate a user by ID and update the document record in one command.
    User.findByIdAndUpdate(newId, {
    // This method takes an ID followed by parameters you’d like to replace for that document
    //  by using the $set command
          $set: userData
        }).then(data => {
      if (data) {
            console.log('Line 167 - GetUserByIdAndUpdate - Booking updated successfully:', data);
            res.status(200).send({ message: 'Booking updated successfully', data })
          } else {
            res.status(401).send({ message: 'Booking Not updated successfully'})
            console.log('Booking not found');
          }
          })
          .catch(error => {
            console.log('Error in Update User : '+JSON.stringify(error,undefined,2));
          });
  },

  // Add a route to handle put requests to the GetUserByIdAndUpdate option,
  // with a new image, I mean saving the new image in the database
  
  GetUserByIdAndUpdateNewImage: (req, res) => {

    //console.log("Estoy en GetUserByIdAndUpdateNewImage - line 177 -req.file.path: "+req.file.path);
    //console.log("estoy en GetUserByIdAndUpdateNewImage - line 178 -req.params.id:"+req.params.userid)
    let newId = req.params.userid;
    console.log("estoy en GetUserByIdAndUpdateNewImage  - line 187 newId:"+newId)
    if(!ObjectId.isValid(req.params.userid)){
    return res.status(400).send('No record with given Id ');}

      var userData = {
            fullName:    req.body.fullName,
            email:       req.body.email,
            password:    req.body.password,
            ide:         req.body.ide,
            role:        req.body.role,
            phoneNumber: req.body.phoneNumber,
            image:       req.file.path 
    };
    console.log("estoy en GetUserByIdAndUpdateNewImage - line 193 -req.params.id:"+req.params.userid)
    // Use findByIdAndUpdate to locate a user by ID and update the document record in one command.
    User.findByIdAndUpdate(newId, {
      // This method takes an ID followed by parameters you’d like to replace for that document
      //  by using the $set command
          $set: userData
        }).then(data => {

      if (data) {
            //console.log('Line 202 - GetUserByIdAndUpdateNewImage - User updated successfully:', data);
            res.status(200).send({ message: 'User updated successfully', data })
          } else {
            res.status(401).send({ message: 'User Not updated successfully'})
            //console.log('Line 206 - GetUserByIdAndUpdateNewImage - Booking not found');
          }
          })
          .catch(error => {
            console.log('Error in Update User : '+JSON.stringify(error,undefined,2));
          });
  },


// Add an action to handle get requests to the profile view option

GetProfileData: (req, res) => {
  //console.log("Estoy en userController - GetProfileData - line 218 -req.params.userid:"+req.params.userid);
  User.findById({ _id: req.params.userid })
  .then(data => {
     // Send saved data to the next then code block.
     // Store the user data on the response and call the next middleware function.
     // console.log("Estoy en userController - GetProfileData - line 223 -data:"+data)
     {res.json(data)}

  })
  // Log error messages and redirect to the home page.
  .catch(error => {
    res.status(403).json("Error in Finding the Doc");
  });},

// function to delete a user Image from Uploads dir when user is erased
PostDeleteImageCtrl:async(req, res) => {

    const Image = req.body.image;
    const filePath = Image;
    //console.log("Estoy en userController - line 237 - GetDeleteImageCtrl - image: " + Image);
    fs.unlink(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(200).send({ message: 'File not found' });
            }
            return res.status(200).send({ message: 'Error deleting file', error: err });
        }
        //console.log("Estoy en userController - line 269 - GetDeleteImageCtrl - File deleted successfully ");
        res.status(200).json({ message: 'File deleted successfully' ,});
    });
},

PutUpdatePassword: async(req, res) => {
//console.log("Estoy en userController - line 336 - PutUpdatePassword - req.params.id: "+req.params.id);
/** changing the password to save it with cripto*/
        const password = req.body.password;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        req.body.password = hashedPassword;

        await User.findByIdAndUpdate(req.params.id, { 
            // if was the only way I could find to save those
            // items with findByIdAndUpdate, not using const BookingToUpdate = { req.body }, etc.....
            password: req.body.password
             }, { new: true })
            .then(updatedUserPassword => {
          if (updatedUserPassword) {
            //console.log('Line 265 - Password updated successfully:',updatedUserPassword);
            res.status(200).send({ message: 'Password updated successfully',  updatedUserPassword })
          } else {
            res.status(401).send({ message: 'Password Not updated successfully'})
            console.log('User not found');
          }
        })
        .catch(error => {
          console.error('Error updating Booking:', error);
        })    
    },
 // function to delete a user by Id
    DeleteUserCtrl: async(req, res) => {
      try {
        await User.findByIdAndDelete(req.params.id);
        //console.log("Estoy en userController - line 280 - DeleteUserCtrl - User deleted successfully ");
        res.status(200).send({ message: 'House Deleted Successfully' });
    } catch (error) {
        console.log(error);
        res.status(401).send({ message: `delete House api issue : ${error}`, error })
    }
}

}