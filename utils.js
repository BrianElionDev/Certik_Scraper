/**
 * Utility function to wait for a specified number of seconds
 * @param {number} seconds - Number of seconds to wait
 * @returns {Promise<void>}
 */
export const waitSeconds = (seconds) => {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
};
