import { chargeMonth, currentPeriod, ensureFeeIndexes } from '../services/monthlyFeeService.js';

const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Charges the current month's class fees on startup and every six hours.
 * chargeMonth skips students already charged, so repeated runs are harmless,
 * and they also pick up students enrolled part-way through a month and the
 * first run after the 1st rolls everyone into the new month.
 */
export const startMonthlyChargeScheduler = async () => {
  try {
    await ensureFeeIndexes();
  } catch (err) {
    console.warn('Monthly fees: could not sync fee indexes:', err.message);
  }

  const run = async () => {
    try {
      const result = await chargeMonth({ period: currentPeriod() });
      if (result.created > 0) {
        console.log(`Monthly fees: charged ${result.created} student(s) for ${result.period}.`);
      }
      if (result.failed.length) {
        console.warn(`Monthly fees: ${result.failed.length} charge(s) failed for ${result.period}:`, result.failed);
      }
    } catch (err) {
      console.warn('Monthly fees: charge run failed:', err.message ?? err);
    }
  };

  await run();
  setInterval(run, SIX_HOURS).unref();
};
