import 'dotenv/config';
import { client } from '../src/services/redis';

// Exemplo de implementação de Pipeline com Redis

const run = async () => {
    
    await client.hSet('car1', {
        color: 'red',
        year: '2020'
    });
    await client.hSet('car2', {
        color: 'yellow',
        year: '2015'
    });
    await client.hSet('car3', {
        color: 'green',
        year: '2010'
    });

    const commands = [1,2,3].map((i) => client.hGetAll(`car${i}`));

    const results = await Promise.all(commands);
    
    console.log(results);
};
run();
