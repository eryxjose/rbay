import type { CreateBidAttrs, Bid } from '$services/types';
import { bidHistoryKey } from '$services/keys';
import { client } from '$services/redis';
import { DateTime } from 'luxon';

export const createBid = async (attrs: CreateBidAttrs) => {
	const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

	return client.rPush(bidHistoryKey(attrs.itemId), serialized);
};

export const getBidHistory = async (itemId: string, offset = 0, count = 10): Promise<Bid[]> => {
//	const results = await client.lRange(bidHistoryKey(itemId), offset, offset + count - 1);
	const startIndex = -1 * offset - count;
	const endIndex = -1 - offset;
	
	const range = await client.lRange(bidHistoryKey(itemId), startIndex, endIndex);

	return range.map(bid => deserializeHistory(bid));
}

// export const getBidHistory = async (itemId: string, offset = 0, count = 10): Promise<Bid[]> => {
// 	return [];
// };

const serializeHistory = (amount: number, createdAt: number) => {
	return `${amount}:${createdAt}}`;
}

const deserializeHistory = (storedValue: string) => {
	const [amount, createdAt] = storedValue.split(':');

	return {
		amount: parseFloat(amount),
		createdAt: DateTime.fromMillis(parseInt(createdAt))
	};
}



