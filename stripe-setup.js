#!/usr/bin/env node
/**
 * VelocityMesh Stripe Setup Script
 * Creates products and prices for VelocityMesh subscription plans
 */

const Stripe = require('stripe');
require('dotenv').config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = [
  {
    id: 'velocitymesh-professional',
    name: 'VelocityMesh Professional',
    description: 'Professional workflow automation with 100 compute hours/month',
    price: 2900, // $29.00
    interval: 'month',
  },
  {
    id: 'velocitymesh-enterprise',
    name: 'VelocityMesh Enterprise',
    description: 'Enterprise workflow automation with 1000 compute hours/month',
    price: 19900, // $199.00
    interval: 'month',
  },
  {
    id: 'velocitymesh-unlimited',
    name: 'VelocityMesh Unlimited',
    description: 'Unlimited workflow automation with unlimited compute hours',
    price: 99900, // $999.00
    interval: 'month',
  },
];

async function createProduct(productData) {
  try {
    console.log(`Creating product: ${productData.name}...`);
    
    const product = await stripe.products.create({
      id: productData.id,
      name: productData.name,
      description: productData.description,
      type: 'service',
    });

    console.log(`✅ Product created: ${product.id}`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: productData.price,
      currency: 'usd',
      recurring: {
        interval: productData.interval,
      },
    });

    console.log(`✅ Price created: ${price.id}`);
    console.log(`   Add to .env: STRIPE_PRICE_${productData.id.replace('velocitymesh-', '').toUpperCase()}=${price.id}`);
    
    return { product, price };
  } catch (error) {
    if (error.code === 'resource_already_exists') {
      console.log(`⚠️  Product ${productData.id} already exists`);
      
      // Try to create price for existing product
      try {
        const price = await stripe.prices.create({
          product: productData.id,
          unit_amount: productData.price,
          currency: 'usd',
          recurring: {
            interval: productData.interval,
          },
        });
        
        console.log(`✅ Price created for existing product: ${price.id}`);
        console.log(`   Add to .env: STRIPE_PRICE_${productData.id.replace('velocitymesh-', '').toUpperCase()}=${price.id}`);
      } catch (priceError) {
        console.log(`❌ Error creating price: ${priceError.message}`);
      }
    } else {
      console.error(`❌ Error creating product ${productData.name}:`, error.message);
    }
  }
}

async function createWebhookEndpoint() {
  try {
    console.log('\nCreating webhook endpoint...');
    
    const webhook = await stripe.webhookEndpoints.create({
      url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/webhooks/stripe`,
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
      ],
    });

    console.log(`✅ Webhook endpoint created: ${webhook.id}`);
    console.log(`   Add to .env: STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
    
  } catch (error) {
    console.error(`❌ Error creating webhook:`, error.message);
  }
}

async function listExistingProducts() {
  try {
    console.log('\n📋 Existing VelocityMesh products:');
    
    const products = await stripe.products.list({
      limit: 100,
    });

    const velocityMeshProducts = products.data.filter(p => 
      p.id.startsWith('velocitymesh-') || p.name.includes('VelocityMesh')
    );

    if (velocityMeshProducts.length === 0) {
      console.log('   No VelocityMesh products found.');
      return;
    }

    for (const product of velocityMeshProducts) {
      console.log(`   - ${product.name} (${product.id})`);
      
      // Get prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 10,
      });
      
      prices.data.forEach(price => {
        const amount = (price.unit_amount / 100).toFixed(2);
        console.log(`     Price: $${amount}/${price.recurring?.interval} (${price.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing products:', error.message);
  }
}

async function main() {
  console.log('🚀 VelocityMesh Stripe Setup');
  console.log('============================\n');

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    console.log('Please add your Stripe secret key to the .env file');
    process.exit(1);
  }

  const command = process.argv[2];

  switch (command) {
    case 'list':
      await listExistingProducts();
      break;
      
    case 'webhook':
      await createWebhookEndpoint();
      break;
      
    case 'setup':
    default:
      console.log('Creating VelocityMesh subscription products...\n');
      
      for (const productData of PRODUCTS) {
        await createProduct(productData);
        console.log('');
      }
      
      await createWebhookEndpoint();
      
      console.log('\n🎉 Setup complete!');
      console.log('\nNext steps:');
      console.log('1. Copy the STRIPE_PRICE_* environment variables to your .env file');
      console.log('2. Copy the STRIPE_WEBHOOK_SECRET to your .env file');
      console.log('3. Test the webhook endpoint with: stripe listen --forward-to localhost:3001/api/webhooks/stripe');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createProduct, createWebhookEndpoint, listExistingProducts };