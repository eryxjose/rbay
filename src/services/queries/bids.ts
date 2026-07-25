import type { CreateBidAttrs, Bid } from '$services/types';
import { bidHistoryKey, itemsKey, itemsByPriceKey } from '$services/keys';
import { client } from '$services/redis';
import { DateTime } from 'luxon';
import { getItem } from '$services/queries/items';

export const createBid = async (attrs: CreateBidAttrs) => {
	return client.executeIsolated(async isolatedClient =>  {

		await isolatedClient.watch(itemsKey(attrs.itemId));

		const item = await getItem(attrs.itemId);
		
		if (!item) {
			throw new Error(`Item with id ${attrs.itemId} not found`);
		}
		
		if (item.price >= attrs.amount) {
			throw new Error('Bid too low');
		}
		
		if (item.endingAt.diff(DateTime.now()).toMillis() <= 0) {
			throw new Error('Item has already ended');
		}

		const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

		return isolatedClient.multi()
			.rPush(bidHistoryKey(attrs.itemId), serialized)
			.hSet(itemsKey(item.id), {
				bids: item.bids + 1,
				price: attrs.amount,
				highestBidUserId: attrs.userId
			})
			.zAdd(itemsByPriceKey(), {
				value: item.id,
				score: attrs.amount
			})
			.exec();
	});
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



