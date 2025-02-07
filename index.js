const dayjs = require('dayjs');
const express = require('express');
const crypto = require('crypto'); // Ensure crypto is imported
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 80;

const products = require('./products.json'); // Ensure products.json exists

// Allow frontend requests from 127.0.0.1:5500
app.use(cors({
    origin: '*'
}));


app.use(express.json());
app.use(bodyParser.json());

// Home Page
app.get('/', (req, res) => res.send('Hello! We created our first backend.'));

// Products
app.get('/products', (req, res) => res.json(products));
app.get('/products/first', (req, res) => {
    res.json(products.length > 0 ? products[0] : { error: "No products available" });
});

// Cart
app.get('/cart', (req, res) => res.send('Load cart'));

// Delivery Options
const deliveryOptions = [
    { id: '1', deliveryDays: 7, priceCents: 0 },
    { id: '2', deliveryDays: 3, priceCents: 49 },
    { id: '3', deliveryDays: 1, priceCents: 99 }
];

// Helper function to check if a date falls on a weekend
const isSatSun = (date) => date.day() === 6 || date.day() === 0;

// Function to calculate estimated delivery date
const dateFormat = (deliveryOption) => {
    let remainingDays = deliveryOption.deliveryDays;
    let deliveryDate = dayjs().startOf("day"); // Start from today at 00:00

    while (remainingDays > 0) {
        deliveryDate = deliveryDate.add(1, "day");
        if (!isSatSun(deliveryDate)) remainingDays--; // Skip weekends
    }

    return deliveryDate.format('YYYY-MM-DD HH:mm:ss'); // Preserve full date & time
};


// Orders Endpoint
app.post('/orders', (req, res) => {
    const { cart } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ error: "Cart is empty or invalid." });
    }

    let totalCost = 0;

    const productsList = cart.map(cartItem => {
        const product = products.find(p => p.id === cartItem.productId);
        const deliveryOption = deliveryOptions.find(o => o.id === cartItem.deliveryOptionId);

        if (!product) {
            return res.status(400).json({ error: `Product not found: ${cartItem.productId}` });
        }

        if (!deliveryOption) {
            return res.status(400).json({ error: `Invalid delivery option: ${cartItem.deliveryOptionId}` });
        }

        const productPrice = product.priceCents * cartItem.quantity;
        const shippingPrice = deliveryOption.priceCents;

        totalCost += productPrice + shippingPrice;

        return {
            productId: product.id,
            quantity: cartItem.quantity,
            estimatedDeliveryTime: dateFormat(deliveryOption),
            variation: null
        };
    });

    // Apply discount if total cost is >= 999
    const promotionApplied = totalCost >= 999 ? 40 : 0;
    const finalTotalCost = totalCost - promotionApplied;

    res.json({
        id: crypto.randomUUID(),
        orderTime: new Date().toISOString(),
        totalCost: finalTotalCost,  // Send final total cost after promotion
        products: productsList
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
