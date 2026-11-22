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

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Create Stripe Checkout Session for a tenant's booking
router.post("/create-checkout-session", async (req, res) => {
  console.log("Im at index.js router - line 29 - router.post - '/create-checkout-session'");
  console.log("Im at index.js router - line 30 - stripe initialized:", Boolean(stripe));

  try {
    if (!stripe) {
      return res.status(500).json({ message: "STRIPE_SECRET_KEY is not configured" });
    }

    const { bookingId } = req.body;
    console.log("Im at index.js router - line 39 - router.post - bookingId:", bookingId);
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const bookings = await Booking.find({ tenantId: bookingId }).sort({ bookedAt: -1 });
    console.log("Im at index.js router - line 44 - router.post - booking:", bookings.length);

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Pick the most recent booking for this tenantId
const targetBooking = bookings[0];

const houseIdStr = targetBooking.houseId?.toString();

console.log("Im at index.js router - line 55 - houseIdStr:", houseIdStr);
console.log("Im at index.js router - line 56 - targetBooking.houseCode:", targetBooking.houseCode);

let house = houseIdStr ? await House.findById(houseIdStr) : null;
if (!house && houseIdStr) {
  const houses = await House.find({ houseId: houseIdStr });
  house = Array.isArray(houses) ? houses[0] : houses;
}

console.log("Im at index.js router - line 54 - router.post - house:", house);
    const nightlyRate =
      house?.pricePerNight ||
      targetBooking.RentPrice ||
      targetBooking.initialAmountToPay ||
      100;
    const unitAmountCents = Math.round(nightlyRate * 100);

    console.log("Im at index.js router - line 69 - house?.houseCode:", house?.houseCode);
    console.log("Im at index.js router - line 70 - targetBooking.houseCode:", targetBooking.houseCode);
    console.log("Im at index.js router - line 71 - targetBooking.houseId:", targetBooking.houseId);

    
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
             // name: `House Booking (${house?.houseCode || targetBooking.houseCode || targetBooking.houseId})`,
             name: `House Booking (${house?.houseCode || targetBooking.houseCode || targetBooking.houseId})`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(targetBooking._id),
      },
      
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/booking/cancel?booking_id=${targetBooking._id}`,
    });

    targetBooking.stripeSessionId = session.id;
    await targetBooking.save();

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return res.status(500).json({ message: "Failed to create checkout session" });
  }
});

module.exports = router;