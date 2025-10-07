import { Payment } from '../models/Payment.js';
import { confirmPayment } from './paymentService.js';

// Hàm này sẽ được sử dụng khi implement webhook thật
export async function handlePaymentWebhook(payload, signature) {
  // Verify webhook signature
  if (!verifyWebhookSignature(payload, signature)) {
    throw new Error('Invalid webhook signature');
  }

  const { 
    orderId,
    transactionId,
    amount,
    status
  } = payload;

  // Validate transaction
  const payment = await Payment.findOne({
    order_id: orderId,
    'provider_payload.transaction_id': transactionId
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.amount !== amount) {
    throw new Error('Amount mismatch');
  }

  // Update payment & order status
  return confirmPayment(orderId);
}

// Mock function để test ở local
export async function simulatePaymentWebhook(orderId, amount) {
  const payload = {
    orderId,
    transactionId: `TEST${Date.now()}`,
    amount,
    status: 'success'
  };

  const signature = 'test-signature';  // Mock signature

  try {
    const response = await fetch('http://localhost:3000/api/orders/payment-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  } catch (error) {
    console.error('Mock webhook failed:', error);
    throw error;
  }
}

// Helper function để verify signature - sẽ implement sau
function verifyWebhookSignature(payload, signature) {
  // TODO: Implement signature verification
  return true;
}