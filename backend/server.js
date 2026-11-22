// renthousebackend\server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const Stripe = require("stripe");
const connectDb = require("./config/db");
const Booking = require("./models/booking");
const router = require("./routes/index");

dotenv.config();

const app = express();
//const stripe = process.env.STRIPE_SECRET_KEY
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Connect to database
connectDb();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/uploads", express.static("uploads"));

// Stripe Webhook must receive the raw body BEFORE JSON/urlencoded parsers run
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ message: "Stripe webhook is not configured" });
    }

    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;

        if (!bookingId) {
          console.warn(
            `Webhook checkout.session.completed missing metadata.bookingId (event: ${event.id}, session: ${session.id})`
          );
          return res.json({ received: true });
        }

        if (session.payment_status !== "paid") {
          console.log(
            `Skipping booking ${bookingId} update: session.payment_status is "${session.payment_status}" (session: ${session.id})`
          );
          return res.json({ received: true });
        }

        const existingBooking = await Booking.findById(bookingId);
        if (!existingBooking) {
          console.warn(`Booking not found for bookingId: ${bookingId} (event: ${event.id})`);
          return res.json({ received: true });
        }

        const alreadyPaid =
          existingBooking.paymentStatus === "paid" ||
          existingBooking.paymentstatus === "paid";

        if (alreadyPaid && existingBooking.stripeSessionId === session.id) {
          console.log(
            `Idempotent skip: booking ${bookingId} already marked paid for session ${session.id} (event: ${event.id})`
          );
          return res.json({ received: true });
        }

        const paidTimestamp = existingBooking.paidAt || new Date();

        const updated = await Booking.findByIdAndUpdate(
          bookingId,
          {
            paymentStatus: "paid",
            paymentstatus: "paid",
            stripeSessionId: session.id,
            paidAt: paidTimestamp,
          },
          { new: true }
        );

        console.log(
          "Booking marked paid:",
          String(updated?._id),
          "| session:",
          updated?.stripeSessionId,
          "| paidAt:",
          updated?.paidAt
        );
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("Error processing webhook event:", event.id, err);
      return res.status(500).json({ message: "Webhook handler error" });
    }
  }
);
// Standard body parsers for all normal JSON/form routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set("port", process.env.PORT || 3001);

app.get("/", (req, res) => {
  res.send("Hi");
});

app.use(methodOverride("_method", { methods: ["POST", "GET"] }));
app.use("/", router);

app.listen(app.get("port"), () => {
  console.log(
    `Server running at http://localhost:${app.get("port")}`.bgCyan.blue
  );
});
