const User = require('../models/user'); // Path to your User model
const Booking = require('../models/booking'); // Path to your bookingDetails model
const House = require('../models/houses'); // Path to your House model

exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Get counts from USER collection using aggregation for efficiency
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]);

    // Map the aggregation result to a readable format
    const stats = {
      tenants: 0,
      admins: 0,
      owners: 0,
      activeContracts: 0,
      incomingFunds: 0,
      maintenanceRequests: 0,
      activeUsersCount: 0
    };

    stats.activeUsersCount = await User.countDocuments({
      role: { $in: ['Admin', 'Owner', 'Tenant'] }
    });

    userCounts.forEach(item => {
      if (item._id === 'Tenant') stats.tenants = item.count;
      if (item._id === 'Admin') stats.admins = item.count;
      if (item._id === 'Owner') stats.owners = item.count;
    });

    // 2. ACTIVE CONTRACTS: Counts where contract is true
    stats.activeContracts = await Booking.countDocuments({ contract: true });

    // 3. INCOMING FUNDS: Sum of RentPrice or initialAmountToPay where status is 'Paid' / 'Completed'
    // Depending on your requirements, this sums the RentPrice of all active or completed bookings
    const fundsResult = await Booking.aggregate([
      { 
        $match: { 
          $or: [
            { initialAmountToPayStatus: 'Paid' },
            { lastPaymentStatus: 'Completed' }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalFunds: { $sum: "$RentPrice" } // Or use initialAmountToPay depending on business logic
        }
      }
    ]);
    stats.incomingFunds = fundsResult.length > 0 ? fundsResult[0].totalFunds : 0;

    // 4. NUMBER OF MAINTENANCE REQUESTS: Filter out 'None' statuses
    stats.maintenanceRequests = await Booking.countDocuments({
      maintenaceRequestStatus: { $in: ['Pending', 'In Progress'] } // Active issues
    });

    console.log("Estoy en adminDashboardController - line 66 - stats.maintenanceRequests: " + stats.maintenanceRequests);
    console.log("Estoy en adminDashboardController - line 67 - stats.incomingFunds: " + stats.incomingFunds);
    console.log("Estoy en adminDashboardController - line 68 - stats.tenants: " + stats.tenants);
    console.log("Estoy en adminDashboardController - line 69 - stats.admins: " + stats.admins);
    console.log("Estoy en adminDashboardController - line 70 - stats.owners: " + stats.owners);
    console.log("Estoy en adminDashboardController - line 71 - stats.activeContracts: " + stats.activeContracts);
    console.log("Estoy en adminDashboardController - line 72 - stats.activeUsersCount: " + stats.activeUsersCount);
    

    return res.status(200).json({ success: true, data: stats });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: "Error fetching dashboard data", 
      error: error.message 
    });
  }
};

// 1. Get 12 Latest Houses Created
exports.getLatestCreatedHouses = async (req, res) => {
  try {
    const latestHouses = await House.find({})
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(12);              // Limit results to 12 documents

    return res.status(200).json({
      success: true,
      data: latestHouses
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching latest created houses",
      error: error.message
    });
  }
};

// 2. Get 12 Latest Houses Booked
exports.getLatestBookedHouses = async (req, res) => {
  try {
    const latestBookings = await Booking.find({})
      .sort({ bookedAt: -1 }) // Sort by newest bookings first
      .limit(12);             // Limit results to 12 documents

    return res.status(200).json({
      success: true,
      data: latestBookings
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching latest booked houses",
      error: error.message
    });
  }
};

// function to get the latest maintenance requests
exports.getLatestMaintenanceRequests = async (req, res) => {
  console.log("Im at admindashboardcontroller - line 128 - getLatestMaintenanceRequests ")  
  try {
    // Finds bookings that have a valid maintenance status (excluding 'None')
    const latestRequests = await Booking.find({
      maintenaceRequestStatus: { $ne: 'None' }
    })
    .sort({ updatedAt: -1 }) // Sort by latest updated requests first
    .limit(12);              // Restrict result count to 12

    return res.status(200).json({
      success: true,
      data: latestRequests
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching maintenance requests",
      error: error.message
    });
  }
};

// function to get the all maintenance requests
exports.getallMaintenanceRequests = async (req, res) => {
  console.log("Im at admindashboardcontroller - line 152 - getalltMaintenanceRequests ")  
  try {
    // Finds bookings that have a valid maintenance status (excluding 'None')
    const latestRequests = await Booking.find({
      maintenaceRequestStatus: { $ne: 'None' }
    })
    .sort({ updatedAt: -1 }) // Sort by latest updated requests first
    return res.status(200).json({
      success: true,
      data: latestRequests
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching maintenance requests",
      error: error.message
    });
  }
};