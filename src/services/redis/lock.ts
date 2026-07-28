import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: (client: Client, signal: any) => any) => {
	// Initialize variables to control retry behavior
	const retryDelay = 100; // milliseconds
	const timeoutMs = 2000; // milliseconds
	let retries = 20; // number of retries

	// Generate random value for lock ownership
	const token = randomBytes(6).toString('hex');

	// Create lock key 
	const lockKey = `lock:${key}`;

	// While loop to implement retry behavior
	while (retries >= 0) {
		retries--;
		
		// Try to do a SET NX operation
		const acquired = await client.set(lockKey, token, {
			NX: true, // Set only if not exists
			PX: timeoutMs // Set expiration time to 2000 milliseconds
		});
		
		if (!acquired) {
			// If lock not acquired, pause and retry
			await pause(retryDelay);
			continue;
		}

		// If the SET is successful, run the callback 
		try {
			const signal = { expired: false };
			setTimeout(() => {
				signal.expired = true;
			}, timeoutMs);

			const proxiedClient = buildClientProxy(timeoutMs);
			const result = await cb(proxiedClient, signal);
			return result;
		} finally {
			// Release the lock by deleting the key
			client.unlock(lockKey, token);
		}
	}
};

type Client = typeof client;
const buildClientProxy = (timeout: number) => {
	const startTime = Date.now();

	const handler = {
		get(target: Client, prop: keyof Client) {
			if (Date.now() >= startTime + timeout) {
				throw new Error('Lock expired');
			}

			const value = target[prop];

			return typeof value === 'function' ? value.bind(target) : value;
		}
	}

	return new Proxy(client, handler) as Client;
};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
