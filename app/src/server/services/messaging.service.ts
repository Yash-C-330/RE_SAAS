import twilio, { type Twilio } from "twilio";

export class MessagingService {
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Missing required Twilio environment variables");
    }

    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  async sendSMS(params: { tenantId: string; to: string; body: string }) {
    const message = await this.client.messages.create({
      to: params.to,
      from: this.fromNumber,
      body: params.body,
    });

    return {
      tenantId: params.tenantId,
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: params.body,
      estimatedCost: 0.0075,
    };
  }
}
