import {
  ClientRequest,
  createServer,
  IncomingMessage,
  ServerResponse
} from 'http';
import { createHmac, timingSafeEqual } from 'crypto';
import { get, request } from 'https';
import { parse, stringify } from 'querystring';
import { GitHubBranch, SlackChannel, SlackChannelResponse } from './lib';

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

if (!process.env.GITHUB_API_TOKEN) {
  console.error('You must export a GITHUB_API_TOKEN environment variable.');
  process.exit(1);
}

if (!process.env.GITHUB_ORGANIZATION) {
  console.error('You must export a GITHUB_ORGANIZATION environment variable.');
  process.exit(1);
}

if (!process.env.GITHUB_REPO) {
  console.error('You must export a GITHUB_REPO environment variable.');
  process.exit(1);
}

if (!process.env.CIRCLE_API_TOKEN) {
  console.error('You must export a CIRCLE_API_TOKEN environment variable.');
  process.exit(1);
}

createServer((request, response) => {
  const { method, url } = request;

  if (method !== 'POST') {
    response.statusCode = 405;
    return response.end();
  }

  if (url === '/') {
    return handleRootRequest(request, response);
  } else if (url === '/deploy') {
    return handleDeployRequest(request, response);
  } else {
    response.statusCode = 404;
    return response.end();
  }
}).listen(8000);

function handleRootRequest(
  request: IncomingMessage,
  response: ServerResponse
): void {
  let rawBody: Buffer[] = [];

  request
    .on('error', error => handleRequestError(error, response))
    .on('data', chunk => rawBody.push(chunk))
    .on('end', async () => {
      const body: string = Buffer.concat(rawBody).toString();
      const { headers } = request;
      const timestamp: string = headers['x-slack-request-timestamp'] as string;
      const requestSignature: string = headers['x-slack-signature'] as string;
      const version: string = requestSignature.slice(0, 2);

      if (potentialReplayAttack(timestamp)) {
        response.statusCode = 400;
        return response.end('Not today, Time Lord!');
      }

      if (invalidRequestSignature(version, timestamp, body, requestSignature)) {
        response.statusCode = 400;
        return response.end('Could not verify request signature.');
      }

      const channel: string = parse(body).channel_id as string;

      if (await invalidRequestOrigin(channel)) {
        return response.end(
          'You are not authorized to perform that action in this conversation. The attempt has been logged.'
        );
      }

      const branches: GitHubBranch[] = await fetchBranches();

      if (branches.length === 0) {
        const org: string = process.env.GITHUB_ORGANIZATION as string;
        const repo: string = process.env.GITHUB_REPO as string;

        return response.end(
          `Could not find any branches for ${org}/${repo}. Are you sure your branch is pushed up to GitHub?`
        );
      }

      const responseBody: string = constructBranchesResponse(branches);

      response.setHeader('Content-Type', 'application/json');
      return response.end(responseBody);
    });
}

function handleDeployRequest(
  request: IncomingMessage,
  response: ServerResponse
): void {
  let rawBody: Buffer[] = [];

  request
    .on('error', error => handleRequestError(error, response))
    .on('data', chunk => rawBody.push(chunk))
    .on('end', async () => {
      const body: string = Buffer.concat(rawBody).toString();
      const { headers } = request;
      const timestamp: string = headers['x-slack-request-timestamp'] as string;
      const requestSignature: string = headers['x-slack-signature'] as string;
      const version: string = requestSignature.slice(0, 2);

      if (potentialReplayAttack(timestamp)) {
        response.statusCode = 400;
        return response.end('Not today, Time Lord!');
      }

      if (invalidRequestSignature(version, timestamp, body, requestSignature)) {
        response.statusCode = 400;
        return response.end('Could not verify request signature.');
      }

      const parsedBody = parse(body);
      const payload = JSON.parse(parsedBody.payload as string);
      const branch = payload.actions[0].selected_options[0].value;
      const slackUserID = payload.user.id;
      const slackUsername = payload.user.name;

      deployBranch(branch, slackUserID, slackUsername);

      const org: string = process.env.GITHUB_ORGANIZATION as string;
      const repo: string = process.env.GITHUB_REPO as string;

      return response.end(
        `:rocket: Deploying branch ${branch} of ${org}/${repo}`
      );
    });
}

function deployBranch(
  branch: string,
  slackUserID: string,
  slackUsername: string
): void {
  const token: string = process.env.CIRCLE_API_TOKEN as string;
  const org: string = process.env.GITHUB_ORGANIZATION as string;
  const repo: string = process.env.GITHUB_REPO as string;
  const queryParams: string = stringify({ 'circle-token': token });
  const buildParameters: string = JSON.stringify({
    build_parameters: {
      CIRCLE_JOB: 'build',
      DEPLOY_ENV: 'qa',
      SLACK_USER_ID: slackUserID,
      SLACK_USERNAME: slackUsername,
      TRIGGERED_BY: 'leeroy'
    }
  });

  const options = {
    hostname: 'circleci.com',
    method: 'POST',
    path: `/api/v1.1/project/github/${org}/${repo}/tree/${branch}?${queryParams}`,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req: ClientRequest = request(options, response => {
    let rawBody: string = '';

    response
      .on('data', chunk => (rawBody += chunk))
      .on('end', () => {
        try {
          const body: GitHubBranch[] = JSON.parse(rawBody);
          console.dir(body);
          return true;
        } catch (e) {
          console.error(e);
          return false;
        }
      });
  });

  req.on('error', console.error);
  req.write(buildParameters);
  req.end();
}

function handleRequestError(error: Error, response: ServerResponse): void {
  console.error('REQUEST ERROR', error);
  response.statusCode = 400;
  return response.end();
}

function potentialReplayAttack(timestamp: string): boolean {
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

function invalidRequestSignature(
  version: string,
  timestamp: string,
  body: string,
  requestSignature: string
): boolean {
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

function invalidRequestOrigin(channel: string): Promise<boolean> {
  const token: string = process.env.SLACK_API_TOKEN as string;
  const queryParams: string = stringify({ token, channel });

  const options = {
    hostname: 'slack.com',
    path: `/api/conversations.info?${queryParams}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  return new Promise((resolve, _reject) =>
    get(options, response => {
      let rawBody: string = '';

      response
        .on('data', chunk => (rawBody += chunk))
        .on('end', () => {
          try {
            const body: SlackChannelResponse = JSON.parse(rawBody);

            if (!body.ok) return resolve(true);

            const channel: SlackChannel = body.channel as SlackChannel;
            const deploymentChannel: string = process.env
              .DEPLOYMENT_CHANNEL as string;

            if (channel.name_normalized !== deploymentChannel)
              return resolve(true);

            return resolve(false);
          } catch (e) {
            console.error(e);
            return resolve(true);
          }
        });
    })
  );
}

function fetchBranches(): Promise<GitHubBranch[]> {
  const token: string = process.env.GITHUB_API_TOKEN as string;
  const org: string = process.env.GITHUB_ORGANIZATION as string;
  const repo: string = process.env.GITHUB_REPO as string;
  const queryParams: string = stringify({ per_page: 100 });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${org}/${repo}/branches?${queryParams}`,
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': org
    }
  };

  return new Promise((resolve, _reject) =>
    get(options, response => {
      let rawBody: string = '';

      response
        .on('data', chunk => (rawBody += chunk))
        .on('end', () => {
          try {
            const branches: GitHubBranch[] = JSON.parse(rawBody);
            return resolve(branches);
          } catch (e) {
            console.error(e);
            return resolve([]);
          }
        });
    })
  );
}

function constructBranchesResponse(branches: GitHubBranch[]): string {
  return JSON.stringify({
    text: 'Which branch would you like to deploy?',
    response_type: 'ephemeral',
    replace_original: true,
    attachments: [
      {
        fallback:
          "It seems like your client can't display this message. Contact Tea Mops if this is unexpected.",
        color: '#00B3E6',
        attachment_type: 'default',
        callback_id: 'branch_selection',
        actions: [
          {
            name: 'branch',
            text: 'Pick a branch...',
            type: 'select',
            confirm: {
              title: 'Are you sure?'
            },
            options: branches.map(({ name }) => ({ text: name, value: name }))
          }
        ]
      }
    ]
  });
}
