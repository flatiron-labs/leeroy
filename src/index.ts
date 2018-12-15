import { createServer, ServerResponse } from 'http';
import { createHmac, timingSafeEqual } from 'crypto';
import { get } from 'https';
import { parse, stringify } from 'querystring';
import { SlackChannel, SlackChannelResponse } from './lib';

if (!process.env.SLACK_SIGNING_SECRET) {
  console.error('You must export a SLACK_SIGNING_SECRET environment variable.');
  process.exit(1);
}

if (!process.env.SLACK_API_TOKEN) {
  console.error('You must export a SLACK_API_TOKEN environment variable.');
  process.exit(1);
}

if (!process.env.DEPLOYMENT_CHANNEL) {
  console.error('You must export a DEPLOYMENT_CHANNEL environment variable.');
  process.exit(1);
}

createServer((request, response) => {
  const { headers, method, url } = request;

  if (url !== '/') {
    response.statusCode = 404;
    response.end();
  }

  if (method !== 'POST') {
    response.statusCode = 405;
    response.end();
  }

  let rawBody: Buffer[] = [];

  request
    .on('error', error => handleRequestError(error, response))
    .on('data', chunk => rawBody.push(chunk))
    .on('end', async () => {
      const body: string = Buffer.concat(rawBody).toString();
      const timestamp: string = headers['x-slack-request-timestamp'] as string;
      const requestSignature: string = headers['x-slack-signature'] as string;
      const version: string = requestSignature.slice(0, 2);

      if (potentialReplayAttack(timestamp)) {
        response.statusCode = 400;
        response.end('Not today, Time Lord!');
      }

      if (invalidRequestSignature(version, timestamp, body, requestSignature)) {
        response.statusCode = 400;
        response.end('Could not verify request signature.');
      }

      const channel: string = parse(body).channel_id as string;

      if (await invalidRequestOrigin(channel)) {
        response.statusCode = 200;
        response.end('You are not authorized to perform that action in this conversation. The attempt has been logged.');
      }

      response.statusCode = 200;
      response.end('VERY NICE!');
    });
}).listen(8000);

function handleRequestError (error: Error, response: ServerResponse): void {
  console.error('REQUEST ERROR', error);
  response.statusCode = 400;
  response.end();
}

function potentialReplayAttack (timestamp: string): boolean {
  const requestTime: number = parseInt(timestamp, 10);
  const currentTime: number = Math.trunc(Date.now() / 1000);
  const delta = Math.abs(currentTime - requestTime);

  const isPotentialReplayAttack: boolean = delta >= 300;

  if (isPotentialReplayAttack) {
    console.error('Potential Replay Attack');
    console.error(`Request Time: ${requestTime}`);
    console.error(`Current Time: ${currentTime}`);
    console.error(`Delta: ${delta}`);
  }

  return isPotentialReplayAttack;
}

function invalidRequestSignature (version: string, timestamp: string, body: string, requestSignature: string): boolean {
  const signingSecret: string = process.env.SLACK_SIGNING_SECRET as string;
  const hmac = createHmac('sha256', signingSecret);
  const baseString: string = `${version}:${timestamp}:${body}`;
  hmac.update(baseString);
  const computedSignature: string = 'v0=' + hmac.digest('hex');

  const requestIsInvalid: boolean = !timingSafeEqual(
    Buffer.from(computedSignature, 'utf8'),
    Buffer.from(requestSignature, 'utf8')
  );

  if (requestIsInvalid) {
    console.error('Invalid Request Signature');
    console.error(`Computed Signature: ${computedSignature}`);
    console.error(`Request Signature: ${requestSignature}`);
  }

  return requestIsInvalid;
}

function invalidRequestOrigin (channel: string): Promise<boolean> {
  const token: string = process.env.SLACK_API_TOKEN as string;
  const queryParams: string = stringify({ token, channel });

  const options = {
    hostname: 'slack.com',
    path: `/api/conversations.info?${queryParams}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  return new Promise((resolve, _reject) => get(options, response => {
    let rawBody: string = '';

    response
      .on('data', chunk => rawBody += chunk)
      .on('end', () => {
        try {
          const body: SlackChannelResponse = JSON.parse(rawBody);

          if (!body.ok) return resolve(true);

          const channel: SlackChannel = body.channel as SlackChannel;
          const deploymentChannel: string = process.env.DEPLOYMENT_CHANNEL as string;

          if (channel.name_normalized !== deploymentChannel) return resolve(true);

          return resolve(false);
        } catch (e) {
          console.error(e);
          return resolve(true);
        }
      });
  }));
}
