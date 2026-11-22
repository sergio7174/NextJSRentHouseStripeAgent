"use strict";

const express = require("express");
const Stripe = require("stripe");
const Booking = require("../models/booking");
const House = require("../models/houses");

const router = express.Router();

const userRoutes = require("./userRoutes");
const houseRoutes = require("./houseRoutes");
const bookingRoutes = require("./bookingRoutes");
const authRoutes = require("./authRoutes");
const metricsRoutes = require("./metricsRoutes");

router.use("/", userRoutes);
router.use("/api/auth", authRoutes);
router.use("/api/house", houseRoutes);
router.use("/api/booking", bookingRoutes);
router.use("/api/user", userRoutes);
router.use("/api/metrics", metricsRoutes);

//const stripe = process.env.STRIPE_SECRET_KEY
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Create Stripe Checkout Session for an existing booking
  router.post("/create-checkout-session", async (req, res) => {
  console.log("Im at index.js router - line 29 - router.post - '/create-checkout-session' ")
  console.log("Im at index.js router - line 30 - router.post - 'STRIPE_SECRET_KEY: ' " + stripe)
  

  try {
    if (!stripe) {
      return res.status(500).json({ message: "STRIPE_SECRET_KEY is not configured" });
    }

    const { bookingId } = req.body;
    console.log("Im at index.js router - line 39 - router.post - bookingId: " + bookingId)
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    //const booking = await Booking.findById(bookingId);
    const booking = await Booking.find({tenantId:bookingId});
                      
    console.log("Im at index.js router - line 49 - router.post - booking: " + booking)
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    const house = await House.findById(booking.houseId);
    const unitAmountCents = Math.round((house?.pricePerNight || 100) * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `House Booking (${house?.houseCode || booking.houseId})`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(booking._id),
      },
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/booking/cancel?booking_id=${booking._id}`,
    });

    booking.stripeSessionId = session.id;
    await booking.save();

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ message: "Failed to create checkout session" });
  }
});

module.exports = router;
