const 

House = require('../models/houses'),
dotenv=require('dotenv'),
fs = require('fs'),
path = require('path');


// function to create House
exports.PostcreateHouse = async (req, res) => {
  const imagePath = req.file?.path || '/uploads/default-house.jpg';
  console.log('Estoy en HouseController - line 12 - imagePath: ' + imagePath);

  const houseCodeExists = await House.findOne({ houseCode: req.body.houseCode });
  if (houseCodeExists) {
    return res.status(401).json({ message: 'houseCode already exits' });
  }

  const NewHouse = new House({
    houseCode: req.body.houseCode,
    ownerId: req.body.ownerId,
    ownerfullname: req.body.ownerfullname,
    owneremail: req.body.owneremail,
    description: req.body.description,
    booked: req.body.booked ?? false,
    pincode: req.body.pincode,
    state: req.body.state,
    city: req.body.city,
    street: req.body.street,
    landmark: req.body.landmark,
    totalRooms: req.body.totalRooms,
    legalDocuments: req.body.legalDocuments,
    RentPrice: req.body.RentPrice,
    createdAt: new Date(),
    image: imagePath,
  });

  await NewHouse.save();
  return res.status(200).send({ NewHouse, message: 'House Created Successfully ..' });
},

// function to list all Houses booked=false
exports.GetListAllHousesByOwnerBfalse= async(req, res) => {
    console.log("Estoy en HouseController - line 45 - GetListAllHousesBookedFalse");
    console.log("Im at house controller- GetListAllHousesByOwnerBfalse - line 46 - req.body.ownerId:  " , req.params.ownerId )
            try {
                 const ownerId = req.params.ownerId;
                 const booked = false;
                  if (!ownerId) {
                  return res.status(400).send({ message: 'ownerId is required to fetch houses by owner' });}
                 const houses = await House.find({ ownerId, booked }).limit(12).sort({ createdAt: -1 });
                
                 console.log("Estoy en HouseController - line 53 - GetListAllHousesBookedFalse: " + houses.length); 
                res.status(200).send({ message: 'All Houses fetched successfully for owner and booked: false', total: houses.length, availableHousesRaw: houses })
            } catch (error) {
                console.log(error);
                res.status(401).send({ message: `get all Houses api issue : ${error}`, error })
            }
}

exports.GetListAllHousesByOwnerBtrue= async(req, res) => {
    //console.log("Im at house controller- GetListAllHousesByOwnerBtrue - line 62 - req.body.ownerId:  " , req.params.ownerId )
    try {
        const ownerId = req.params.ownerId;
        const booked = true;
        //const ownerId = req.params.ownerId || req.body.ownerId || req.query.ownerId;
        //console.log("Im at house controller - GetListAllHousesByOwnerBtrue- line 67 - req.body.ownerId:  " , req.params.ownerId )

        if (!ownerId) {
            return res.status(400).send({ message: 'ownerId is required to fetch houses by owner' });
        }
        const houses = await House.find({ ownerId, booked }).limit(12).sort({ createdAt: -1 });
        //console.log("Im at house controller - GetListAllHousesByOwnerBtrue - line 73 - houses:  " , houses )

        return res.status(200).send({
            message: 'Houses fetched successfully for owner and booked: true',
            total: houses.length,
            houses
        });
    } catch (error) {
        console.error('Error fetching houses by owner:', error);
        return res.status(500).send({ message: `get houses by owner api issue : ${error}`, error });
    }
}

// end of the block of list all Houses
// function to delete a House Image from Uploads dir when House is erased

exports.PostdeleteImageCtrl= async(req, res) => {

    const Image = req.body.image;
    const filePath = Image;
    //console.log("Estoy en HouseController - line 93 - GetDeleteImageCtrl - image: " + Image);

    fs.unlink(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.status(200).send({ message: 'File not found' });
            }
            //console.log("Estoy en HouseController - line 100 - GetDeleteImageCtrl - image - Error deleting file ");
            return res.status(200).send({ message: 'Error deleting file', error: err });
        }
        //console.log("Estoy en HouseController - line 103 - GetDeleteImageCtrl - image - File deleted successfully ");
        res.status(200).json({ message: 'File deleted successfully' ,});
    });
}
// function to delete a House
exports.deleteHouseCtrl= async(req, res) => {
    //console.log("Estoy en HouseController - line 109 - GetDeleteHouseCtrl - id: "+req.params.id);
    try {
        const housedeleted = await House.findByIdAndDelete(req.params.id);
        //console.log("Estoy en HouseController - line 112 - GetDeleteHouseCtrl - housedeleted: "+ housedeleted);
        res.status(200).send({ message: 'House Deleted Successfully' });
    } catch (error) {
        console.log(error);
        res.status(401).send({ message: `delete House api issue : ${error}`, error })
    }
}
// End of block function to delete a House
// function to Edit a Saved House
exports.PutupdateHouseCtrl= async(req, res) => {
    if (req.params.id) {
        //console.log("Estoy en HouseController - line 123 - PutupdateHouseCtrl - req.params.id: "+req.params.id);
    }
        await House.findByIdAndUpdate(req.params.id, { 
            // if was the only way I could find to save those
            // items with findByIdAndUpdate, not using const HouseToUpdate = { req.body }, etc.....
            houseCode: req.body.houseCode,
            ownerId: req.body.ownerId,
            description: req.body.description,
            booked: req.body.booked,
            pincode: req.body.pincode,
            state: req.body.state,
            city: req.body.city,
            street: req.body.street,
            landmark: req.body.landmark,
            state: req.body.state,
            totalRooms: req.body.totalRooms,
            legalDocuments: req.body.legalDocuments,
            RentPrice: req.body.RentPrice,
            image: req.file.path,
            
             }, { new: true })

            .then(updatedHouse => {
          if (updatedHouse) {
            //console.log('House updated successfully - line 147 - houseController - PutupdateHouseCtrl :', updatedHouse);
            res.status(200).send({ message: 'House updated successfully',  updatedHouse })
          } else {
            res.status(401).send({ message: 'House Not updated successfully'})
            console.log('House not found');
          }
        })
        .catch(error => {
          console.error('Error updating House:', error);
        })    
    } 
// function to update a House keeping the old image
exports.PutupdateHouseBookedCtrl= async(req, res) => {

    console.log("Estoy en HouseController - line 160 - PutupdateHouseBookedCtrl - : Here we go");
    console.log("Estoy en HouseController - line 161 - PutupdateHouseBookedCtrl - req.body.houseCode: "+req.body.houseCode);
    console.log("Estoy en HouseController - line 162 - PutupdateHouseBookedCtrl - req.params.id: "+req.params.id);

    if (req.params.id) {
        console.log("Estoy en HouseController - line 162 - PutupdateHouseBookedCtrl - req.params.id: "+req.params.id);
    }
        await House.findByIdAndUpdate(req.params.id, { 
            // if was the only way I could find to save those
            // items with findByIdAndUpdate, not using const HouseToUpdate = { req.body }, etc.....  
            booked: req.body.booked,
           
            
             }, { new: true })

            .then(updatedHousebooked => {
          if (updatedHousebooked) {
            console.log('House updated successfully - line 214:', updatedHousebooked);
            res.status(200).send({ message: 'House updated successfully',  updatedHousebooked })
          } else {
            res.status(401).send({ message: 'House Not updated successfully'})
            console.log('House not found');
          }
        })
        .catch(error => {
          console.error('Error updating House:', error);
        })    
    } 
// function to update a House keeping the old image
  
  

exports.PutupdateHouseOldImageCtrl = async (req, res) => {
    try {
        //console.log("Estoy en HouseController - line 191 - PutupdateHouseOldImageCtrl - req.params.id:", req.params.id);
        //console.log("Estoy en HouseController - line 192 - PutupdateHouseOldImageCtrl - req.body.ownerId:", req.body.ownerId);
        //console.log("Estoy en HouseController - line 193 - PutupdateHouseOldImageCtrl - req.body.houseCode:", req.body.houseCode);
        if (!req.params.id) {
            return res.status(400).send({ message: 'House id is required' });
        }

        const updatedHouse = await House.findByIdAndUpdate(
            req.params.id,
            {
                houseCode: req.body.houseCode,
                ownerId: req.body.ownerId,
                description: req.body.description,
                booked: req.body.booked,
                pincode: req.body.pincode,
                state: req.body.state,
                city: req.body.city,
                street: req.body.street,
                landmark: req.body.landmark,
                totalRooms: req.body.totalRooms,
                legalDocuments: req.body.legalDocuments,
                RentPrice: req.body.RentPrice,
                image: req.body.image,
            },
            { new: true }
        );

        if (!updatedHouse) {
            return res.status(404).send({ message: 'House not found' });
        }
        //console.log('House updated successfully - line 221:', updatedHouse);
        res.status(200).send({ message: 'House updated successfully', updatedHouse });
    } catch (error) {
        console.error('Error updating House:', error);
        res.status(500).send({ message: `update House api issue: ${error.message}`, error });
    }
};
    
  // function to get a simple House
    exports.GetSingleHouseCtrl= async(req, res) => {
        try {
            //console.log("Estoy en GetSingleHouseCrtl - line 232 - req.params.id: "+req.params.id);
            const house = await House.findById(req.params.id);
            if (!house) {
                return res.status(404).send({ message: 'House not found' });
            }
            //console.log("Im in HouseController - GetSingleHouseCtrl -line 237: house: " + house);
            res.status(200).send({ message: 'Single House Fetched Successfully', house: house })
        } catch (error) {
            console.log(error); 
            res.status(500).send({ message: `get single House api issue : ${error}`, error })
        } } // End of Get simgle House by id
    
// function to list all Houses booked=false
exports.GetListAllHouses = async(req, res) => {

    console.log("Estoy en HouseController - line 247 - GetListAllHouses");
            try {
                const houses = await House.find({}).limit(12).sort({ createdAt: -1 });
               //console.log("Estoy en HouseController - line 250 - GetListAllHouses: " + houses.length); 
               if (houses.length > 0) {
               return res.status(200).json({
               success: true,
               data: houses });
            }
                if (houses.length == 0) {
                return res.status(401).json({
                            success: false,
                             });}

            } catch (error) {
                console.log(error);
                res.status(401).send({ message: `get all Houses api issue : ${error}`, error })
            }
}
// function to list all Bookings by booked false
exports.GetListAllHousesBookedFalse = async(req, res) => {
    console.log("Estoy en BookingController - GetListAllBookingsBookedfalse - line 272 - ");
            try {
                const houses = await House.find({booked:false}).limit(12).sort({ createdAt: -1 });
               //console.log("Estoy en BookingController - GetListAllBookingsBookedfalse - line 271 -  - Bookings[0].houseCode: " + houses[0].houseCode); 
                res.status(200).send({ message: 'All Bookings fetched successfully', total: houses.length, houses })
            } catch (error) {
                console.log(error);
                res.status(200).send({ message: `get all Bookings api issue : ${error}`, error })
            }     
}

// function to list all Houses booked=false
exports.GetListAllHousesByOwnerId= async(req, res) => {
    console.log("Estoy en HouseController - line 286 - GetListAllHousesyOwnerId");
        
            try {
                const houses = await House.find({ownerId:req.params.ownerId}).limit(12).sort({ createdAt: -1 });
               console.log("Estoy en HouseController - line 290 - GetListAllHousesyOwnerId: " + houses);
                res.status(200).send({ message: 'All Houses fetched successfully for owner Id', total: houses.length, houses })
            } catch (error) {
                console.log(error);
                res.status(401).send({ message: `get all Houses api issue : ${error}`, error })
            }
}

