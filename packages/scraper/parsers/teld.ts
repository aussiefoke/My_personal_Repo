/**
 * 特来电价格解析器
 *
 * 接入步骤：
 * 1. pnpm add playwright
 * 2. npx playwright install chromium
 * 3. 取消下方注释，填入真实选择器
 */

export async function parse() {
  // const { chromium } = await import('playwright');
  // const browser = await chromium.launch({ headless: true });
  // const page = await browser.newPage();
  //
  // await page.goto('https://m.teld.cn/charge/price?city=shenzhen');
  // await page.waitForSelector('.price-item');
  //
  // const elecFeePeak   = await page.$eval('.price-peak',   el => parseFloat(el.textContent!));
  // const elecFeeFlat   = await page.$eval('.price-flat',   el => parseFloat(el.textContent!));
  // const elecFeeValley = await page.$eval('.price-valley', el => parseFloat(el.textContent!));
  // const serviceFee    = await page.$eval('.service-fee',  el => parseFloat(el.textContent!));
  //
  // await browser.close();
  // return { elecFeePeak, elecFeeFlat, elecFeeValley, serviceFee };

  // MVP 阶段返回模拟数据
  return {
    elecFeePeak:   0.92,
    elecFeeFlat:   0.68,
    elecFeeValley: 0.38,
    serviceFee:    0.35,
  };
}
