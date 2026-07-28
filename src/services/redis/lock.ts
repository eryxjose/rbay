import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: (signal: any) => any) => {
	// Initialize variables to control retry behavior
	const retryDelay = 100; // milliseconds
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
			PX: 2000 // Set expiration time to 2000 milliseconds
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
			}, 2000);

			const result = await cb(signal);
			return result;
		} catch (error) {
			throw error;
		} finally {
			// Release the lock by deleting the key
			client.unlock(lockKey, token);
		}
	}
};

const buildClientProxy = () => {};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
