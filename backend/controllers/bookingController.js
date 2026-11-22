const 
Booking = require('../models/booking'),
dotenv=require('dotenv'),
fs = require('fs'),
path = require('path');

// function to create Booking
exports.PostCreateBooking = async(req, res) => {

   console.log("Estoy en BookingController - line 10 - req.body.houseId:  "+req.body.houseId);
   
    const bookingData = {
            ownerId:      req.body.ownerId,
            ownerfullname: req.body.ownerfullname,
            owneremail:     req.body.owneremail,
            tenantId:     req.body.tenantId,
            tenantfullname: req.body.tenantfullname,
            tenantemail:    req.body.tenantemail,
            houseId:      req.body.houseId,
            houseCode:    req.body.houseCode,
            state:        req.body.state,
            city:         req.body.city,
            street:       req.body.street,
            image:        req.body.image,
            bookedAt:     new Date(),
            ownerChecked: false,
            approvalStatus: 'notApplied', 
            leftdays: 0,
            ContractInitDay: new Date(),
            notification: '',
            RentPrice: req.body.RentPrice,
            contract: false,
            maintenaceRequest: '',
            maintenaceRequestStatus: 'None',
            lastPaymentDate: Date.now(),
    };

    const booking = new Booking(bookingData);
    const newBooking = await booking.save();
    //console.log("Im in BookingController - line 40: Booking Created Successfully ..NewBooking: "+newBooking);
    return res.status(200).send({ newBooking, message: "Booking Created Successfully .." })
}

// function to list all Bookings
exports.GetListAllBookings = async(req, res) => {
    //console.log("Estoy en BookingController - line 46 - GetListAllBookings");
            try {
                const bookings = await Booking.find({}).limit(12).sort({ createdAt: -1 });
               //console.log("Estoy en BookingController - line 49 - GetListAllBookings - Bookings[0].houseCode: " + bookings[0].houseCode);
                return res.status(200).json({
                success: true,
                data: bookings,
    });
            } catch (error) {
                console.log(error);
                res.status(200).send({ message: `get all Bookings api issue : ${error}`, error })
            }     
}
// function to delete a Booking

exports.GetDeleteBookingCtrl= async(req, res) => {
    //console.log("Estoy en BookingController - line 81 - GetDeleteBookingCtrl - id: " +req.params.id);

    /*** End of block to erase image in uploads dir *****/
    try {

        await Booking.findByIdAndDelete(req.params.id);
    
        res.status(200).send({ message: 'Booking Deleted Successfully' });
    } catch (error) {
        console.log(error);
        res.status(200).send({ message: `delete Booking api issue : ${error}`, error })
    }
    
}
// End of block function to delete a Booking
// function to Edit a Saved Booking
exports.PutUpdateBookingCtrl= async(req, res) => {
    //console.log("Estoy en BookingController - line 98 - PutupdateBookingCtrl - req.params.id: "+req.params.id);
        await Booking.findByIdAndUpdate(req.params.id, { 
            // if was the only way I could find to save those
            // items with findByIdAndUpdate, not using const BookingToUpdate = { req.body }, etc.....

            nameplan:          req.body.nameplan,
            description:       req.body.description,
            trialdays:         req.body.trialdays,
            features:          req.body.features,
            timedays:          req.body.timedays,
            cost:              req.body.cost,        
            code:              req.body.code,
            status:            req.body.status,
            createdAt:         new(Date),
            //finishAt:          futureDate,
            image:             req.file.path 
            
             }, { new: true })

            .then(updatedBooking => {
          if (updatedBooking) {

            //console.log('Booking updated successfully:', updatedBooking);
            
            res.status(200).send({ message: 'Booking updated successfully',  updatedBooking })
          } else {
            res.status(200).send({ message: 'Booking Not updated successfully'})
            console.log('Booking not found');
          }
        })
        .catch(error => {
          console.error('Error updating Booking:', error);
        })    
    }   
  // function to get a simple Booking
    exports.GetSingleBookingCtrl= async(req, res) => {

        try {
            //console.log("Estoy en GetSingleBookingCrtl - line 136 - req.params.id: "+req.params.id);
            const Booking = await Booking.findById({ _id: req.params.id });
            console.log("Estoy en GetSingleBookingCrtl - line 139 - Booking: " + Booking)
            res.status(200).send({ message: 'Single Booking Fetched Successfully', Booking })
        } catch (error) {
            console.log(error); 
            res.status(500).send({ message: `get single Booking api issue : ${error}`, error })
        } } // End of Get simgle Booking by id

// function to list all Bookings
exports.GetListAllBookingsByTenantId = async(req, res) => {

    const TenantId = req.params.tenantId;
    console.log("Estoy en BookingController -GetListAllBookingsByTenantId- line 130 - GetListAllBookingsByTenantId: " + TenantId);
    
            try {
                const Bookings = await Booking.find({tenantId:TenantId}).limit(12).sort({ createdAt: -1 });
                
                if (Bookings.length === 0) {
                    return res.status(404).send({ message: 'No bookings found for this tenant', total: 0, Bookings: [] });
                }

                console.log("Estoy en BookingController -GetListAllBookingsByTenantId-- line 158 - GetListAllBookings - Bookings[0].houseCode: " + Bookings[0].houseCode);
                
                return res.status(200).send({ message: 'All Bookings fetched successfully', total: Bookings.length, Bookings });

            } catch (error) {
                console.log(error);
                res.status(401).send({ message: `get all Bookings api issue : ${error}`, error })
            }     
}

// function to get all Bookings by ownerId
// 
exports.GetListAllBookingsByOwnerId= async(req, res) => {

    console.log("Im at booking controller- GetListAllHousesByOwnerBtrue - line 153 - req.body.ownerId:  " , req.params.ownerId )

    try {
        const ownerId = req.params.ownerId;
        const booked = true;
        console.log("Im at booking controller - GetListAllHousesByOwnerId- line 158 - req.body.ownerId:  " , req.params.ownerId )
        if (!ownerId) {
            return res.status(401).send({ message: 'ownerId is required to fetch houses by owner' });
        }
        const ownerbooking = await Booking.find( {ownerId:ownerId} ).limit(12).sort({ createdAt: -1 });
        console.log("Im at booking controller - GetListAllHousesByOwnerId - line 163 - houses:  " , ownerbooking.length )

        if (ownerbooking.length > 0) {
        return res.status(200).send({
            message: 'Houses fetched successfully for owner and booked: true',
            total: ownerbooking.length,
            ownerbooking: ownerbooking
        });}
        if (ownerbooking.length == 0) {
        return res.status(401).send({
            message: 'get houses by owner api issue. Database Empty for this ownerId and booked: true',
        });}
    } catch (error) {
        console.error('Error fetching houses by owner:', error);
        return res.status(401).send({ message: `get houses by owner api issue : ${error}`, error });
    }
}

// function to update a Booking when the house is checked by the owner
exports.PutUpdateBookingHouseCheckedCtrl= async(req, res) => {
    const monthlyPrice = req.body.RentPrice;
    console.log("Estoy en BookingController - line 203 - PutUpdateBookingHouseCheckedCtrl - monthlyPrice: " + monthlyPrice);
    /** Block to calculate the # of days to pay the rent of the house booked by the user */

    const today = new Date();
    const currentDay = today.getDate();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = Jan, 11 = Dec

    let rentStartDate;
    // 1. Determine official rent cycle start date
    if (currentDay > 15) {
      rentStartDate = new Date(currentYear, currentMonth + 1, 1);
    } else {
      rentStartDate = new Date(currentYear, currentMonth, 1);
    }

    // 2. Get total days in the current month to find the exact daily rate
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dailyRate = monthlyPrice / totalDaysInMonth;

    // 3. Calculate remaining days left in the month (inclusive of today)
    const daysLeftInMonth = (totalDaysInMonth - currentDay) + 1;

    // 4. Calculate the prorated amount to pay for the rest of this month
    // Using parseFloat().toFixed(2) to prevent long floating point decimals
    const initialAmountToPay = parseFloat((dailyRate * daysLeftInMonth).toFixed(2));

    /*** End of Block to calculate the # of days to pay the rent of the house booked by the user */

    if (req.params.id) {
        console.log("Estoy en HouseController - line 267 - PutUpdateBookingHouseCheckedCtrl - req.params.id: "+req.params.id);
    }
        await Booking.findByIdAndUpdate(req.params.id, { 
            // if was the only way I could find to save those
            // items with findByIdAndUpdate, not using const HouseToUpdate = { req.body }, etc.....  
            ownerChecked: req.body.ownerChecked,
            approvalStatus: req.body.approvalStatus,
            leftdays: daysLeftInMonth,
            initialAmountToPay: initialAmountToPay,
            initialAmountToPayStatus: 'Not Paid',
            contract: true,


             }, { new: true })

            .then(updatedHousebookedownerChecked => {
          if (updatedHousebookedownerChecked) {

            //console.log('House updated successfully - line 251 - PutUpdateBookingHouseCheckedCtrl', updatedHousebookedownerChecked);
            
            res.status(200).send({ message: 'Booking updated successfully',  updatedHousebookedownerChecked })
          } else {
            res.status(401).send({ message: 'Booking Not updated successfully'})
            console.log('House not found');
          }
        })
        .catch(error => {
          console.error('Error updating House:', error);
        })    
    } 

// function to update a Booking creating a maintenance request by the Owner
exports.PutbookinghousecreatemaintreqCtrl= async(req, res) => {

    if (req.params.id) {
        //console.log("Estoy en HouseController - line 268 - PutbookinghousecreatemaintreqCtrl - Booking Id - req.params.id: " + req.params.id);
    }
        await Booking.findByIdAndUpdate(req.params.id, { 
            // if was the only way I could find to save those
            // items with findByIdAndUpdate, not using const HouseToUpdate = { req.body }, etc.....  
            maintenaceRequest: req.body.maintenaceRequest,
            
             }, { new: true })

            .then(maintenaceRequestUpdated => {
          if (maintenaceRequestUpdated) {

            console.log('House updated successfully - line 280 - PutbookinghousecreatemaintreqCtrl:', maintenaceRequestUpdated);
            
            res.status(200).send({ message: 'Booking updated successfully',  maintenaceRequestUpdated })
          } else {
            res.status(401).send({ message: 'Booking Not updated successfully'})
            console.log('House not found');
          }
        })
        .catch(error => {
          console.error('Error updating House:', error);
        })    
    } 

    // function to update a Booking deleting a maintenance request by Admin
exports.PutbookingupdatemaintreqCtrl= async(req, res) => {

    if (req.params.id) {
        console.log("Estoy en HouseController - line 334 - PutbookingupdatemaintreqCtrl - Booking Id - req.params.id: " + req.params.id);
    }
        await Booking.findByIdAndUpdate(req.params.id, { 
            // if was the only way I could find to save those
            // items with findByIdAndUpdate, not using const HouseToUpdate = { req.body }, etc.....  
            maintenaceRequest: req.body.maintenaceRequest,
            maintenaceRequestStatus: req.body.maintenaceRequestStatus,
             }, { new: true })

            .then(maintenaceRequestUpdated => {
          if (maintenaceRequestUpdated) {

            console.log('Booking Document updated successfully:', maintenaceRequestUpdated);
            
            res.status(200).send({ message: 'Booking updated successfully',  maintenaceRequestUpdated })
          } else {
            res.status(401).send({ message: 'Booking Not updated successfully'})
            console.log('House not found');
          }
        })
        .catch(error => {
          console.error('Error updating Booking:', error);
        })    
    } 