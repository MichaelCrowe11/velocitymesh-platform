import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { PaymentService, PRICING_PLANS } from '../services/PaymentService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

interface CreateCheckoutBody {
  planId: string;
}

interface CreatePortalBody {
  returnUrl?: string;
}

export default async function billingRoutes(fastify: FastifyInstance) {
  const paymentService = new PaymentService(fastify.prisma);

  // Get pricing plans
  fastify.get('/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    return PRICING_PLANS.map(plan => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      computeHours: plan.computeHours,
      features: plan.features,
    }));
  });

  // Get current usage
  fastify.get(
    '/usage',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const usage = await paymentService.getUserUsage(request.user.id);
        return usage;
      } catch (error) {
        reply.code(500).send({ error: 'Failed to get usage' });
      }
    }
  );

  // Create checkout session
  fastify.post(
    '/create-checkout',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Body: CreateCheckoutBody }>, reply: FastifyReply) => {
      try {
        const { planId } = request.body;
        
        if (!planId) {
          return reply.code(400).send({ error: 'Plan ID is required' });
        }

        const sessionUrl = await paymentService.createCheckoutSession(
          request.user.id,
          planId
        );

        return { url: sessionUrl };
      } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message || 'Failed to create checkout session' });
      }
    }
  );

  // Create customer portal session
  fastify.post(
    '/create-portal',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Body: CreatePortalBody }>, reply: FastifyReply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
        });

        if (!user?.stripeCustomerId) {
          return reply.code(400).send({ error: 'No active subscription found' });
        }

        const returnUrl = request.body.returnUrl || `${process.env.FRONTEND_URL}/settings/billing`;

        const session = await stripe.billingPortal.sessions.create({
          customer: user.stripeCustomerId,
          return_url: returnUrl,
        });

        return { url: session.url };
      } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message || 'Failed to create portal session' });
      }
    }
  );

  // Stripe webhook handler
  fastify.post(
    '/webhooks/stripe',
    {
      config: {
        rawBody: true, // Need raw body for Stripe signature verification
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const signature = request.headers['stripe-signature'] as string;
      
      if (!signature) {
        return reply.code(400).send({ error: 'No stripe signature' });
      }

      try {
        await paymentService.handleWebhook(signature, request.rawBody as string);
        return { received: true };
      } catch (error: any) {
        fastify.log.error('Webhook error:', error);
        reply.code(400).send({ error: error.message });
      }
    }
  );

  // Cancel subscription
  fastify.post(
    '/cancel-subscription',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
        });

        if (!user?.stripeSubscriptionId) {
          return reply.code(400).send({ error: 'No active subscription found' });
        }

        const subscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          { cancel_at_period_end: true }
        );

        await fastify.prisma.user.update({
          where: { id: request.user.id },
          data: { subscriptionStatus: 'canceling' },
        });

        return {
          message: 'Subscription will be canceled at the end of the billing period',
          cancelAt: subscription.cancel_at,
        };
      } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message || 'Failed to cancel subscription' });
      }
    }
  );

  // Resume subscription (undo cancellation)
  fastify.post(
    '/resume-subscription',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await fastify.prisma.user.findUnique({
          where: { id: request.user.id },
        });

        if (!user?.stripeSubscriptionId) {
          return reply.code(400).send({ error: 'No subscription found' });
        }

        const subscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          { cancel_at_period_end: false }
        );

        await fastify.prisma.user.update({
          where: { id: request.user.id },
          data: { subscriptionStatus: 'active' },
        });

        return {
          message: 'Subscription resumed successfully',
          status: subscription.status,
        };
      } catch (error: any) {
        fastify.log.error(error);
        reply.code(500).send({ error: error.message || 'Failed to resume subscription' });
      }
    }
  );
}