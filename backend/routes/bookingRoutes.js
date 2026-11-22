const 

upload = require ('../middleware/upload'),

  // use the Router module in Express.js
  // This line creates a Router object that offers its own middleware
  // and routing alongside the Express.js app object.
  router = require("express").Router(),

  { PostCreateBooking,
    GetListAllBookings,
    GetListAllBookingsByTenantId,
    GetListAllBookingsBookedfalseCtrl,
    GetListAllBookingsByOwnerId,
    GetDeleteBookingCtrl,
    PutUpdateBookingCtrl,
    PutUpdateBookingHouseCheckedCtrl,
    PutbookinghousecreatemaintreqCtrl,
    PutbookingupdatemaintreqCtrl,
    GetSingleBookingCtrl,
    PostDeleteImageCtrl,
     } = require('../controllers/bookingController');
  
// post create booking
router.post('/createbooking', PostCreateBooking);
// get list all bookings by tenant Id
router.get('/listAllBookingsByTenantId/:tenantId', GetListAllBookingsByTenantId);
// get list all bookings by owner Id
router.get('/listAllBookingsByOwnerId/:ownerId', GetListAllBookingsByOwnerId);
// get list all bookings documents
router.get('/listAllBookingsDocuments', GetListAllBookings);
//delete Booking route
router.delete('/delete-Booking/:id', GetDeleteBookingCtrl);
//update Booking route
router.put('/update-Booking/:id', upload.single("image"), PutUpdateBookingCtrl); 
//getSingleProduct route
router.get('/get-single-Booking/:id', GetSingleBookingCtrl);
//update Booking route a booking document when the house its checked
router.put('/updateBookinghousechecked/:id', upload.single("image"), PutUpdateBookingHouseCheckedCtrl); 
//update Booking route a booking document when a maintenance request is created for the house
router.put('/bookinghousecreatemaintreq/:id', upload.single("image"), PutbookinghousecreatemaintreqCtrl); 
//update Booking route a booking document when a maintenance request is created for the house
router.put('/bookingupdatemaintreq/:id', upload.single("image"), PutbookingupdatemaintreqCtrl); 


module.exports = router;