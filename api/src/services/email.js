import env from '../utils/env.js';
import { t } from '../i18n/index.js';

// Email templates
const templates = {
    welcome: {
        subject: (lang) => t('email.welcome.subject', lang),
        html: (data, lang) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 ${t('email.welcome.title', lang, { name: data.name })}</h1>
          </div>
          <div class="content">
            <p>${t('email.welcome.greeting', lang, { name: data.name })}</p>
            <p>${t('email.welcome.intro', lang)}</p>
            <ul>
              <li>${t('email.welcome.feature1', lang)}</li>
              <li>${t('email.welcome.feature2', lang)}</li>
              <li>${t('email.welcome.feature3', lang)}</li>
            </ul>
            <center>
              <a href="${env.FRONTEND_URL}/dashboard" class="button">${t('email.welcome.cta', lang)}</a>
            </center>
            <p>${t('email.welcome.support', lang)}</p>
          </div>
          <div class="footer">
            <p>${t('email.footer.copyright', lang)}</p>
            <p>${t('email.footer.unsubscribe', lang)} <a href="${env.FRONTEND_URL}/unsubscribe?token=${data.unsubscribeToken}">${t('email.footer.unsubscribeLink', lang)}</a></p>
          </div>
        </div>
      </body>
      </html>
    `
    },

    passwordReset: {
        subject: (lang) => t('email.passwordReset.subject', lang),
        html: (data, lang) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff6b6b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .code { background: #fff; padding: 15px; border: 2px dashed #ddd; font-size: 24px; letter-spacing: 3px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 ${t('email.passwordReset.title', lang)}</h1>
          </div>
          <div class="content">
            <p>${t('email.passwordReset.greeting', lang, { name: data.name })}</p>
            <p>${t('email.passwordReset.instruction', lang)}</p>
            <div class="code">${data.resetCode}</div>
            <p>${t('email.passwordReset.alternative', lang)}</p>
            <center>
              <a href="${env.FRONTEND_URL}/reset-password?token=${data.resetToken}" class="button">${t('email.passwordReset.cta', lang)}</a>
            </center>
            <p>${t('email.passwordReset.expiry', lang, { hours: 24 })}</p>
            <p>${t('email.passwordReset.ignore', lang)}</p>
          </div>
        </div>
      </body>
      </html>
    `
    },

    subscriptionConfirmation: {
        subject: (lang) => t('email.subscription.subject', lang),
        html: (data, lang) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .plan-box { background: white; border: 2px solid #4CAF50; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .price { font-size: 32px; color: #4CAF50; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ${t('email.subscription.title', lang)}</h1>
          </div>
          <div class="content">
            <p>${t('email.subscription.greeting', lang, { name: data.name })}</p>
            <div class="plan-box">
              <h2>${data.planName}</h2>
              <p class="price">${data.price}/${t('email.subscription.period', lang)}</p>
              <ul>
                ${data.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
            <p>${t('email.subscription.nextBilling', lang, { date: data.nextBillingDate })}</p>
            <p>${t('email.subscription.manage', lang)} <a href="${env.FRONTEND_URL}/billing">${t('email.subscription.manageLink', lang)}</a></p>
          </div>
        </div>
      </body>
      </html>
    `
    },

    paymentFailed: {
        subject: (lang) => t('email.paymentFailed.subject', lang),
        html: (data, lang) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #ff9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ ${t('email.paymentFailed.title', lang)}</h1>
          </div>
          <div class="content">
            <p>${t('email.paymentFailed.greeting', lang, { name: data.name })}</p>
            <div class="warning">
              <p>${t('email.paymentFailed.warning', lang)}</p>
              <p><strong>${t('email.paymentFailed.gracePeriod', lang, { days: data.graceDays })}</strong></p>
            </div>
            <p>${t('email.paymentFailed.instruction', lang)}</p>
            <center>
              <a href="${env.FRONTEND_URL}/billing/update-payment" class="button">${t('email.paymentFailed.cta', lang)}</a>
            </center>
            <p>${t('email.paymentFailed.support', lang)}</p>
          </div>
        </div>
      </body>
      </html>
    `
    },

    trialEnding: {
        subject: (lang) => t('email.trialEnding.subject', lang),
        html: (data, lang) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .countdown { background: white; border: 2px solid #667eea; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .days { font-size: 48px; color: #667eea; font-weight: bold; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ ${t('email.trialEnding.title', lang)}</h1>
          </div>
          <div class="content">
            <p>${t('email.trialEnding.greeting', lang, { name: data.name })}</p>
            <div class="countdown">
              <p class="days">${data.daysRemaining}</p>
              <p>${t('email.trialEnding.daysText', lang)}</p>
            </div>
            <p>${t('email.trialEnding.benefits', lang)}</p>
            <ul>
              ${data.benefits.map(b => `<li>${b}</li>`).join('')}
            </ul>
            <center>
              <a href="${env.FRONTEND_URL}/pricing" class="button">${t('email.trialEnding.cta', lang)}</a>
            </center>
          </div>
        </div>
      </body>
      </html>
    `
    }
};

// Email service interface
class EmailService {
    constructor() {
        this.provider = this.initializeProvider();
    }

    initializeProvider() {
        switch (env.EMAIL_SERVICE) {
            case 'sendgrid':
                return new SendGridProvider();
            case 'ses':
                return new SESProvider();
            case 'smtp':
                return new SMTPProvider();
            default:
                return new ConsoleProvider();
        }
    }

    async send(to, template, data, language = env.DEFAULT_LANGUAGE) {
        if (!templates[template]) {
            throw new Error(`Email template '${template}' not found`);
        }

        const { subject, html } = templates[template];

        const emailData = {
            to,
            from: env.EMAIL_FROM,
            subject: subject(language),
            html: html(data, language)
        };

        try {
            const result = await this.provider.send(emailData);
            console.log(`📧 Email sent: ${template} to ${to}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to send email: ${template} to ${to}`, error);
            throw error;
        }
    }

    async sendBatch(recipients, template, dataMap, language = env.DEFAULT_LANGUAGE) {
        const results = await Promise.allSettled(
            recipients.map(recipient =>
                this.send(recipient, template, dataMap[recipient] || {}, language)
            )
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`📧 Batch email: ${successful} sent, ${failed} failed`);

        return { successful, failed, results };
    }
}

// Email providers
class ConsoleProvider {
    async send(data) {
        console.log('📧 [Console Email Provider]');
        console.log('To:', data.to);
        console.log('From:', data.from);
        console.log('Subject:', data.subject);
        console.log('---');
        console.log('HTML Preview:', data.html.substring(0, 200) + '...');
        console.log('---');
        return { success: true, provider: 'console' };
    }
}

class SendGridProvider {
    async send(data) {
        if (!env.EMAIL_API_KEY) {
            throw new Error('SendGrid API key not configured');
        }

        // SendGrid API implementation
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.EMAIL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: data.to }] }],
                from: { email: data.from },
                subject: data.subject,
                content: [{ type: 'text/html', value: data.html }]
            })
        });

        if (!response.ok) {
            throw new Error(`SendGrid API error: ${response.status}`);
        }

        return { success: true, provider: 'sendgrid', messageId: response.headers.get('x-message-id') };
    }
}

class SESProvider {
    async send(data) {
        // AWS SES implementation would go here
        throw new Error('SES provider not implemented yet');
    }
}

class SMTPProvider {
    async send(data) {
        // SMTP implementation would go here
        throw new Error('SMTP provider not implemented yet');
    }
}

// Email queue for background processing
class EmailQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.batchSize = 10;
        this.retryAttempts = 3;
    }

    add(to, template, data, language) {
        this.queue.push({
            to,
            template,
            data,
            language,
            attempts: 0,
            addedAt: Date.now()
        });

        if (!this.processing) {
            this.process();
        }
    }

    async process() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }

        this.processing = true;
        const batch = this.queue.splice(0, this.batchSize);

        for (const email of batch) {
            try {
                await emailService.send(email.to, email.template, email.data, email.language);
            } catch (error) {
                email.attempts++;

                if (email.attempts < this.retryAttempts) {
                    // Re-queue for retry with exponential backoff
                    setTimeout(() => {
                        this.queue.push(email);
                    }, Math.pow(2, email.attempts) * 1000);
                } else {
                    console.error(`Failed to send email after ${this.retryAttempts} attempts:`, email);
                }
            }
        }

        // Process next batch
        setTimeout(() => this.process(), 1000);
    }
}

// Create singleton instances
export const emailService = new EmailService();
export const emailQueue = new EmailQueue();

// Notification functions
export const notifications = {
    async sendWelcomeEmail(user) {
        return emailService.send(user.email, 'welcome', {
            name: user.full_name || 'User',
            unsubscribeToken: Buffer.from(user.id).toString('base64')
        }, user.language);
    },

    async sendPasswordResetEmail(user, resetToken, resetCode) {
        return emailService.send(user.email, 'passwordReset', {
            name: user.full_name || 'User',
            resetToken,
            resetCode
        }, user.language);
    },

    async sendSubscriptionConfirmation(user, subscription, plan) {
        // Convert new feature columns to features array for email template
        const features = [];
        if (plan.cine_party) features.push('Cine Party (Watch Party)');
        if (plan.cine_party_voice_chat) features.push('Cine Party with Voice Chat');
        if (plan.sync_data_across_devices) features.push('Sync Data Across Devices');
        if (plan.record_live_tv) features.push('Record Live TV');
        if (plan.download_offline_viewing) features.push('Download for Offline Viewing');
        if (plan.parental_controls) features.push('Parental Controls');
        if (plan.support_level === 'email_chat') features.push('Email & Chat Support');
        if (plan.support_level === 'priority_24_7') features.push('24/7 Priority Support');
        else if (plan.support_level === 'email') features.push('Email Support');

        return emailService.send(user.email, 'subscriptionConfirmation', {
            name: user.full_name || 'User',
            planName: plan.name,
            price: `$${plan.price_monthly}`,
            features: features,
            nextBillingDate: new Date(subscription.current_period_end).toLocaleDateString()
        }, user.language);
    },

    async sendPaymentFailedEmail(user, graceDays = 3) {
        return emailService.send(user.email, 'paymentFailed', {
            name: user.full_name || 'User',
            graceDays
        }, user.language);
    },

    async sendTrialEndingEmail(user, daysRemaining) {
        return emailService.send(user.email, 'trialEnding', {
            name: user.full_name || 'User',
            daysRemaining,
            benefits: [
                'Unlimited profiles',
                'Multiple playlists',
                'No ads',
                'HD streaming',
                'Priority support'
            ]
        }, user.language);
    }
};

export default emailService;
