/**
 * Script to seed mock orders for testing order flow UI
 * 
 * Order Flow:
 * 1. pending → buyer can cancel, seller can confirm → processing
 * 2. processing → seller can mark as shipped → shipped
 * 3. shipped → seller can mark as delivered → delivered
 * 4. delivered → buyer can confirm received → completed
 * 5. delivered → buyer can report not received → canceled
 */

import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/revibe';

async function seedOrders() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Get sample users (buyer and seller)
    const users = await User.find().limit(10);
    if (users.length < 2) {
      console.error('❌ Need at least 2 users in database. Please create users first.');
      process.exit(1);
    }

    const buyer = users[0];
    const seller = users[1];

    console.log(`👤 Buyer: ${buyer.email} (${buyer._id})`);
    console.log(`👤 Seller: ${seller.email} (${seller._id})`);

    // Sample address
    const sampleAddress = {
      full_name: buyer.display_name || 'Nguyễn Văn A',
      phone: '0912345678',
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      ward: 'Phường Bến Nghé',
      street: 'Nguyễn Huệ',
      houseNo: '123',
      line1: '123 Nguyễn Huệ, Phường Bến Nghé',
    };

    // Sample items
    const createItems = (count = 1) => {
      const items = [];
      for (let i = 0; i < count; i++) {
        items.push({
          listing_id: new mongoose.Types.ObjectId(),
          seller_id: seller._id,
          title: `Áo thun vintage ${i + 1}`,
          image: 'https://via.placeholder.com/400x400?text=Product',
          qty: 1,
          price: 150000 + (i * 50000),
        });
      }
      return items;
    };

    const calculateAmounts = (items, shipping = 30000) => {
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const fee = Math.round(subtotal * 0.1);
      return {
        subtotal,
        shipping,
        fee,
        discount: 0,
        total: subtotal + shipping + fee,
      };
    };

    // Clear existing orders (optional - comment out if you want to keep existing orders)
    // await Order.deleteMany({});
    // console.log('🗑️  Cleared existing orders');

    const mockOrders = [];

    // 1. PENDING - Buyer can cancel, Seller can confirm
    const items1 = createItems(1);
    mockOrders.push({
      buyer_id: buyer._id,
      seller_id: [seller._id],
      order_status: 'pending',
      payment_status: 'pending',
      shipping_status: 'pending',
      items: items1,
      amounts: calculateAmounts(items1),
      currency: 'VND',
      shipping_address: sampleAddress,
      payment_method: 'online',
      notes: 'Mock order - PENDING state',
      history: [
        {
          at: new Date(Date.now() - 5 * 60 * 1000),
          by: buyer._id,
          action: 'order_created',
          note: 'Đơn hàng được tạo',
        },
      ],
    });

    // 2. PENDING (COD) - Test COD payment method
    const items2 = createItems(2);
    mockOrders.push({
      buyer_id: buyer._id,
      seller_id: [seller._id],
      order_status: 'pending',
      payment_status: 'pending',
      shipping_status: 'pending',
      items: items2,
      amounts: calculateAmounts(items2),
      currency: 'VND',
      shipping_address: sampleAddress,
      payment_method: 'cod',
      notes: 'Mock order - PENDING COD',
      history: [
        {
          at: new Date(Date.now() - 10 * 60 * 1000),
          by: buyer._id,
          action: 'order_created',
          note: 'Đơn hàng được tạo (COD)',
        },
      ],
    });

    // 3. PROCESSING - Seller can mark as shipped
    const items3 = createItems(1);
    mockOrders.push({
      buyer_id: buyer._id,
      seller_id: [seller._id],
      order_status: 'processing',
      payment_status: 'paid',
      shipping_status: 'pending',
      items: items3,
      amounts: calculateAmounts(items3),
      currency: 'VND',
      shipping_address: sampleAddress,
      payment_method: 'online',
      notes: 'Mock order - PROCESSING state',
      history: [
        {
          at: new Date(Date.now() - 2 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'order_created',
          note: 'Đơn hàng được tạo',
        },
        {
          at: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'payment_confirmed',
          note: 'Đã thanh toán',
        },
        {
          at: new Date(Date.now() - 1 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'pending',
          to: 'processing',
          note: 'Người bán đã xác nhận đơn hàng',
        },
      ],
    });

    // 4. SHIPPED - Seller can mark as delivered
    const items4 = createItems(3);
    mockOrders.push({
      buyer_id: buyer._id,
      seller_id: [seller._id],
      order_status: 'shipped',
      payment_status: 'paid',
      shipping_status: 'in_transit',
      items: items4,
      amounts: calculateAmounts(items4),
      currency: 'VND',
      shipping_address: sampleAddress,
      payment_method: 'online',
      notes: 'Mock order - SHIPPED state',
      history: [
        {
          at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'order_created',
          note: 'Đơn hàng được tạo',
        },
        {
          at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'payment_confirmed',
          note: 'Đã thanh toán',
        },
        {
          at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'pending',
          to: 'processing',
          note: 'Người bán đã xác nhận',
        },
        {
          at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'processing',
          to: 'shipped',
          note: 'Đã bàn giao cho đơn vị vận chuyển',
        },
      ],
    });

    // 5. DELIVERED - Buyer can confirm received → completed or report → canceled
    const items5 = createItems(1);
    mockOrders.push({
      buyer_id: buyer._id,
      seller_id: [seller._id],
      order_status: 'delivered',
      payment_status: 'paid',
      shipping_status: 'delivered',
      items: items5,
      amounts: calculateAmounts(items5),
      currency: 'VND',
      shipping_address: sampleAddress,
      payment_method: 'cod',
      notes: 'Mock order - DELIVERED state',
      history: [
        {
          at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'order_created',
          note: 'Đơn hàng được tạo',
        },
        {
          at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'pending',
          to: 'processing',
          note: 'Người bán đã xác nhận',
        },
        {
          at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'processing',
          to: 'shipped',
          note: 'Đã bàn giao cho đơn vị vận chuyển',
        },
        {
          at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'shipped',
          to: 'delivered',
          note: 'Đã giao hàng thành công',
        },
      ],
    });

    // 6. COMPLETED - Example of completed order
    const items6 = createItems(2);
    mockOrders.push({
      buyer_id: buyer._id,
      seller_id: [seller._id],
      order_status: 'completed',
      payment_status: 'paid',
      shipping_status: 'delivered',
      items: items6,
      amounts: calculateAmounts(items6),
      currency: 'VND',
      shipping_address: sampleAddress,
      payment_method: 'online',
      notes: 'Mock order - COMPLETED state',
      history: [
        {
          at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'order_created',
          note: 'Đơn hàng được tạo',
        },
        {
          at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'payment_confirmed',
          note: 'Đã thanh toán',
        },
        {
          at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'pending',
          to: 'processing',
          note: 'Người bán đã xác nhận',
        },
        {
          at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'processing',
          to: 'shipped',
          note: 'Đã bàn giao cho đơn vị vận chuyển',
        },
        {
          at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          by: seller._id,
          action: 'order_status_changed',
          from: 'shipped',
          to: 'delivered',
          note: 'Đã giao hàng thành công',
        },
        {
          at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'order_status_changed',
          from: 'delivered',
          to: 'completed',
          note: 'Người mua đã xác nhận nhận hàng',
        },
      ],
    });

    // 7. CANCELED - Example of canceled order
    const items7 = createItems(1);
    mockOrders.push({
      buyer_id: buyer._id,
      seller_id: [seller._id],
      order_status: 'canceled',
      payment_status: 'canceled',
      shipping_status: 'pending',
      items: items7,
      amounts: calculateAmounts(items7),
      currency: 'VND',
      shipping_address: sampleAddress,
      payment_method: 'online',
      notes: 'Mock order - CANCELED state',
      history: [
        {
          at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'order_created',
          note: 'Đơn hàng được tạo',
        },
        {
          at: new Date(Date.now() - 12 * 60 * 60 * 1000),
          by: buyer._id,
          action: 'buyer_cancel',
          note: 'Người mua đã hủy đơn hàng',
        },
      ],
    });

    // Insert all orders
    const insertedOrders = await Order.insertMany(mockOrders);
    console.log(`\n✅ Inserted ${insertedOrders.length} mock orders:\n`);

    insertedOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order._id}`);
      console.log(`   Status: ${order.order_status}`);
      console.log(`   Payment: ${order.payment_method} (${order.payment_status})`);
      console.log(`   Total: ${order.amounts.total.toLocaleString('vi-VN')} ₫`);
      console.log(`   Items: ${order.items.length}`);
      console.log('');
    });

    console.log('\n📝 Summary:');
    console.log(`   - Buyer ID: ${buyer._id}`);
    console.log(`   - Seller ID: ${seller._id}`);
    console.log(`   - Total Orders: ${insertedOrders.length}`);
    console.log('\n🎯 Order Flow Test Cases:');
    console.log('   1. PENDING → Buyer can cancel, Seller can confirm');
    console.log('   2. PROCESSING → Seller can mark as shipped');
    console.log('   3. SHIPPED → Seller can mark as delivered');
    console.log('   4. DELIVERED → Buyer can confirm received (→ completed) or report (→ canceled)');
    console.log('   5. COMPLETED → Final state');
    console.log('   6. CANCELED → Final state');

    console.log('\n✅ Done! You can now test the order flow in the UI.');

  } catch (error) {
    console.error('❌ Error seeding orders:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

seedOrders();
