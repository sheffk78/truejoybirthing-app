/**
 * Pregnancy Illustration Registry
 * 
 * Static require() mapping for all week-by-week baby development illustrations.
 * WebP files are bundled with the app and loaded via React Native's asset system.
 * 
 * Week 20 uses the "anchor" variant filename.
 */

// Image assets bundled via require() for reliable bundler inclusion
const illustrations: Record<number, any> = {
  4: require('../../assets/illustrations/pregnancy-series/week-04/pregnancy-week-04-approved.webp'),
  5: require('../../assets/illustrations/pregnancy-series/week-05/pregnancy-week-05-approved.webp'),
  6: require('../../assets/illustrations/pregnancy-series/week-06/pregnancy-week-06-approved.webp'),
  7: require('../../assets/illustrations/pregnancy-series/week-07/pregnancy-week-07-approved.webp'),
  8: require('../../assets/illustrations/pregnancy-series/week-08/pregnancy-week-08-approved.webp'),
  9: require('../../assets/illustrations/pregnancy-series/week-09/pregnancy-week-09-approved.webp'),
  10: require('../../assets/illustrations/pregnancy-series/week-10/pregnancy-week-10-approved.webp'),
  11: require('../../assets/illustrations/pregnancy-series/week-11/pregnancy-week-11-approved.webp'),
  12: require('../../assets/illustrations/pregnancy-series/week-12/pregnancy-week-12-approved.webp'),
  13: require('../../assets/illustrations/pregnancy-series/week-13/pregnancy-week-13-approved.webp'),
  14: require('../../assets/illustrations/pregnancy-series/week-14/pregnancy-week-14-approved.webp'),
  15: require('../../assets/illustrations/pregnancy-series/week-15/pregnancy-week-15-approved.webp'),
  16: require('../../assets/illustrations/pregnancy-series/week-16/pregnancy-week-16-approved.webp'),
  17: require('../../assets/illustrations/pregnancy-series/week-17/pregnancy-week-17-approved.webp'),
  18: require('../../assets/illustrations/pregnancy-series/week-18/pregnancy-week-18-approved.webp'),
  19: require('../../assets/illustrations/pregnancy-series/week-19/pregnancy-week-19-approved.webp'),
  20: require('../../assets/illustrations/pregnancy-series/week-20/pregnancy-week-20-anchor-approved.webp'),
  21: require('../../assets/illustrations/pregnancy-series/week-21/pregnancy-week-21-approved.webp'),
  22: require('../../assets/illustrations/pregnancy-series/week-22/pregnancy-week-22-approved.webp'),
  23: require('../../assets/illustrations/pregnancy-series/week-23/pregnancy-week-23-approved.webp'),
  24: require('../../assets/illustrations/pregnancy-series/week-24/pregnancy-week-24-approved.webp'),
  25: require('../../assets/illustrations/pregnancy-series/week-25/pregnancy-week-25-approved.webp'),
  26: require('../../assets/illustrations/pregnancy-series/week-26/pregnancy-week-26-approved.webp'),
  27: require('../../assets/illustrations/pregnancy-series/week-27/pregnancy-week-27-approved.webp'),
  28: require('../../assets/illustrations/pregnancy-series/week-28/pregnancy-week-28-approved.webp'),
  29: require('../../assets/illustrations/pregnancy-series/week-29/pregnancy-week-29-approved.webp'),
  30: require('../../assets/illustrations/pregnancy-series/week-30/pregnancy-week-30-approved.webp'),
  31: require('../../assets/illustrations/pregnancy-series/week-31/pregnancy-week-31-approved.webp'),
  32: require('../../assets/illustrations/pregnancy-series/week-32/pregnancy-week-32-approved.webp'),
  33: require('../../assets/illustrations/pregnancy-series/week-33/pregnancy-week-33-approved.webp'),
  34: require('../../assets/illustrations/pregnancy-series/week-34/pregnancy-week-34-approved.webp'),
  35: require('../../assets/illustrations/pregnancy-series/week-35/pregnancy-week-35-approved.webp'),
  36: require('../../assets/illustrations/pregnancy-series/week-36/pregnancy-week-36-approved.webp'),
  37: require('../../assets/illustrations/pregnancy-series/week-37/pregnancy-week-37-approved.webp'),
  38: require('../../assets/illustrations/pregnancy-series/week-38/pregnancy-week-38-approved.webp'),
  39: require('../../assets/illustrations/pregnancy-series/week-39/pregnancy-week-39-approved.webp'),
  40: require('../../assets/illustrations/pregnancy-series/week-40/pregnancy-week-40-approved.webp'),
};

/**
 * Get the bundled illustration asset for a given pregnancy week (4-40).
 * Returns the require()'d module for use in <Image source={...} />,
 * or undefined if the week is out of range.
 */
export function getPregnancyIllustration(week: number): any {
  return illustrations[week];
}

/**
 * Check if an illustration exists for a given week.
 */
export function hasPregnancyIllustration(week: number): boolean {
  return week in illustrations;
}