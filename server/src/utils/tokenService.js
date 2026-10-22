import jwt from 'jsonwebtoken';

/**
 * @desc    Waxaa lagu soo saaraa Access Token shaqaynaya 15 Daqiiqo (Short-lived)
 * @param   {Object} user - Xogta user-ka ee ka timid database-ka
 * @returns {String} JWT Token string
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role }, // Payload: Xogta lagu dhex qariyo token-ka
    process.env.JWT_ACCESS_SECRET,     // Furaha sirta ah ee laga soo aqriyo .env
    { expiresIn: '15m' }               // Millayga uu dhacayo token-ku
  );
};

/**
 * @desc    Waxaa lagu soo saaraa Refresh Token shaqaynaya 7 Casho (Long-lived)
 * @param   {Object} user - Xogta user-ka ee ka timid database-ka
 * @returns {String} JWT Token string
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },              // Kaliya ID-ga ayaa lagu dhex qariyaa
    process.env.JWT_REFRESH_SECRET, // Furaha labaad ee sirta ah ee .env ku jira
    { expiresIn: '7d' }            // Wuxuu dhacayaa 7 maalmood ka dib
  );
};