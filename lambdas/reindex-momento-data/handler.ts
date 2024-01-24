import {IncomingMessage} from 'http';
import * as https from 'https';

const endpoint = readEnvironmentVariable('ROBOMO_API_ENDPOINT');
const indexName = readEnvironmentVariable('ROBOMO_INDEX_NAME');

export async function handler() {
  try {
    await requestReindex(endpoint, indexName);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: '{}',
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'An error occurred!',
      }),
    };
  }
}

function readEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Could not find environment variable: ${name}`);
  }
  return value;
}

function requestReindex(hostname: string, indexName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path: `/reindex/${indexName}`,
      method: 'POST',
    };

    const req = https.request(options, (res: IncomingMessage) => {
      console.log(`statusCode: ${res.statusCode || 0}`);

      res.on('data', (d: Uint8Array) => {
        console.log(d.toString());
        resolve();
      });
    });

    req.on('error', error => {
      console.error(error);
      reject(error);
    });

    req.end();
  });
}
