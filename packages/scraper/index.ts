import 'dotenv/config';
import cron from 'node-cron';
import { syncPrices } from './jobs/priceSync';

console.log('🤖 ChargeSmart 爬虫服务启动');

// 每4小时同步一次价格
cron.schedule('0 */4 * * *', async () => {
  console.log(`[${new Date().toISOString()}] 开始同步价格...`);
  try {
    await syncPrices();
    console.log('价格同步完成');
  } catch (err) {
    console.error('价格同步失败:', err);
  }
});

// 启动时立即执行一次
syncPrices().then(() => console.log('首次价格同步完成'));
