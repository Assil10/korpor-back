/**
 * Generates an OTP code with a given number of digits and expiry time.
 * @param {Object} options - Configuration options.
 * @param {number} options.digits - Number of digits for the OTP (default is 6).
 * @param {number} options.expiryMinutes - Expiry time in minutes (default is 10).
 * @returns {Object} - An object containing the OTP as a string and its expiry timestamp.
 */
function generateOTP({ digits = 6, expiryMinutes = 10 } = {}) {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const otp = Math.floor(Math.random() * (max - min + 1)) + min;
    const expiry = Date.now() + expiryMinutes * 60 * 1000;
    return { otp: otp.toString(), expiry };
  }
  
  module.exports = { generateOTP };
  