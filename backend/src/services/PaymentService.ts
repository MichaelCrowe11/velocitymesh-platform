import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  computeHours: number;
  features: string[];
  stripePriceId: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    computeHours: 10,
    features: [
      'Unlimited workflows',
      '10 compute hours/month',
      'Basic integrations',
      'Community support',
    ],
    stripePriceId: '', // Free tier
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    computeHours: 100,
    features: [
      'Unlimited workflows',
      '100 compute hours/month',
      'All integrations',
      'AI optimization',
      'Real-time collaboration',
      'Priority support',
    ],
    stripePriceId: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    computeHours: 1000,
    features: [
      'Unlimited workflows',
      '1000 compute hours/month',
      'Advanced AI features',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE || '',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 999,
    computeHours: -1, // Unlimited
    features: [
      'Unlimited workflows',
      'Unlimited compute hours',
      'White-label options',
      'Custom deployment',
      '24/7 dedicated support',
    ],
    stripePriceId: process.env.STRIPE_PRICE_UNLIMITED || '',
  },
];

export class PaymentService {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16',
    });
    this.prisma = prisma;
  }

  async createCheckoutSession(userId: string, planId: string): Promise<string> {
    try {
      const plan = PRICING_PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Invalid plan selected');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const session = await this.stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
        metadata: {
          userId: userId,
          planId: planId,
        },
      });

      logger.info('Checkout session created', {
        userId,
        planId,
        sessionId: session.id,
      });

      return session.url || '';
    } catch (error) {
      logger.error('Failed to create checkout session', error);
      throw error;
    }
  }

  async handleWebhook(signature: string, body: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logger.error('Webhook signature verification failed', err);
      throw new Error('Invalid webhook signature');
    }

    logger.info('Processing webhook event', {
      type: event.type,
      id: event.id,
    });

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, planId } = session.metadata || {};
    
    if (!userId || !planId) {
      logger.error('Missing metadata in checkout session', { sessionId: session.id });
      return;
    }

    const plan = PRICING_PLANS.find(p => p.id === planId);
    if (!plan) {
      logger.error('Invalid plan in checkout session', { planId, sessionId: session.id });
      return;
    }

    // Update user subscription
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: planId,
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      },
    });

    // Reset compute hours for new billing cycle
    await this.prisma.userUsage.upsert({
      where: { userId: userId },
      update: {
        computeHoursUsed: 0,
        computeHoursLimit: plan.computeHours,
        billingCycleStart: new Date(),
      },
      create: {
        userId: userId,
        computeHoursUsed: 0,
        computeHoursLimit: plan.computeHours,
        billingCycleStart: new Date(),
      },
    });

    logger.info('Subscription activated', { userId, planId, sessionId: session.id });
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!user) {
      logger.error('User not found for subscription', { subscriptionId: subscription.id });
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: subscription.status,
      },
    });

    logger.info('Subscription updated', { userId: user.id, status: subscription.status });
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!user) {
      logger.error('User not found for subscription', { subscriptionId: subscription.id });
      return;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionPlan: 'starter',
        subscriptionStatus: 'canceled',
      },
    });

    logger.info('Subscription canceled', { userId: user.id });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Log successful payment
    logger.info('Payment succeeded', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // Handle failed payment
    const user = await this.prisma.user.findFirst({
      where: { stripeCustomerId: invoice.customer as string },
    });

    if (user) {
      // Could implement grace period or account suspension logic
      logger.warn('Payment failed for user', {
        userId: user.id,
        invoiceId: invoice.id,
        amount: invoice.amount_due,
      });
    }
  }

  async getUserUsage(userId: string): Promise<{
    computeHoursUsed: number;
    computeHoursLimit: number;
    billingCycleStart: Date;
    subscriptionPlan: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { usage: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const usage = user.usage || {
      computeHoursUsed: 0,
      computeHoursLimit: 10, // Default starter limit
      billingCycleStart: new Date(),
    };

    return {
      computeHoursUsed: usage.computeHoursUsed,
      computeHoursLimit: usage.computeHoursLimit,
      billingCycleStart: usage.billingCycleStart,
      subscriptionPlan: user.subscriptionPlan || 'starter',
    };
  }

  async recordComputeUsage(userId: string, hours: number): Promise<void> {
    await this.prisma.userUsage.upsert({
      where: { userId },
      update: {
        computeHoursUsed: {
          increment: hours,
        },
      },
      create: {
        userId,
        computeHoursUsed: hours,
        computeHoursLimit: 10,
        billingCycleStart: new Date(),
      },
    });

    logger.info('Compute usage recorded', { userId, hours });
  }

  async checkUsageLimit(userId: string): Promise<boolean> {
    const usage = await this.getUserUsage(userId);
    
    // Unlimited plan
    if (usage.computeHoursLimit === -1) {
      return true;
    }

    return usage.computeHoursUsed < usage.computeHoursLimit;
  }
}