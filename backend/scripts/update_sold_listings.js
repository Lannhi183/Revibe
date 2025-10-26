// Script to update listing status to "sold" for items in completed/delivered/shipped orders
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Listing } from "../models/Listing.js";

const MONGO_URI = "mongodb+srv://Lnhi:songu183204@cluster0.t5uojn3.mongodb.net/revibe?retryWrites=true&w=majority&appName=Cluster0";

async function updateSoldListings() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Find all orders that are not canceled (these should have sold listings)
    const activeOrders = await Order.find({
      order_status: { $in: ["pending", "processing", "shipped", "delivered", "completed"] }
    });

    console.log(`Found ${activeOrders.length} active orders`);

    // Collect all listing IDs from active orders
    const listingIds = new Set();
    activeOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        if (item.listing_id) {
          listingIds.add(String(item.listing_id));
        }
      });
    });

    console.log(`Found ${listingIds.size} unique listings in active orders`);

    if (listingIds.size > 0) {
      // Update these listings to "sold"
      const result = await Listing.updateMany(
        { 
          _id: { $in: Array.from(listingIds).map(id => new mongoose.Types.ObjectId(id)) },
          status: { $ne: "sold" } // Only update if not already sold
        },
        { $set: { status: "sold" } }
      );

      console.log(`✓ Updated ${result.modifiedCount} listings to "sold" status`);
    }

    // Now find canceled orders and restore their listings to active
    const canceledOrders = await Order.find({
      order_status: "canceled"
    });

    console.log(`Found ${canceledOrders.length} canceled orders`);

    const canceledListingIds = new Set();
    canceledOrders.forEach((order) => {
      (order.items || []).forEach((item) => {
        if (item.listing_id) {
          canceledListingIds.add(String(item.listing_id));
        }
      });
    });

    console.log(`Found ${canceledListingIds.size} unique listings in canceled orders`);

    if (canceledListingIds.size > 0) {
      // Only restore listings that are NOT in active orders
      const listingsToRestore = Array.from(canceledListingIds).filter(
        id => !listingIds.has(id)
      );

      if (listingsToRestore.length > 0) {
        const restoreResult = await Listing.updateMany(
          { 
            _id: { $in: listingsToRestore.map(id => new mongoose.Types.ObjectId(id)) },
            status: "sold"
          },
          { $set: { status: "active" } }
        );

        console.log(`✓ Restored ${restoreResult.modifiedCount} listings to "active" status`);
      }
    }

    console.log("\n✓ Script completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
}

updateSoldListings();
