const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/admindashboardController');

router.get('/', dashboardController.getDashboardStats);
router.get('/latest-created', dashboardController.getLatestCreatedHouses);
router.get('/latest-booked', dashboardController.getLatestBookedHouses);
router.get('/latest-maintenance', dashboardController.getLatestMaintenanceRequests);
router.get('/all-maintenance-request', dashboardController.getallMaintenanceRequests);

module.exports = router;