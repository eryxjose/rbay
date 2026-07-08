import type { CreateItemAttrs } from '$services/types';
import { client } from '$services/redis';
import { serialize } from './serialize';
import { genId } from '$services/utils';
import { itemsKey } from '$services/keys';
import { deserialize } from './deserialize';

export const getItem = async (id: string) => {

    const item = await client.hGetAll(itemsKey(id));

    if (Object.keys(item).length === 0) {
        return null;
    }

    return deserialize(id, item);
};

export const getItems = async (ids: string[]) => {
    
    const items = await Promise.all(ids.map(id => client.hGetAll(itemsKey(id))));
    
    return items.map((result, index) => {
        if (Object.keys(result).length === 0) {
            return null;
        }

        return deserialize(ids[index], result);
    });
};

export const createItem = async (attrs: CreateItemAttrs, userId: string) => {

    const id = genId();
    await client.hSet(itemsKey(id), serialize(attrs));

    return id;
};

