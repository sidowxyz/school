import TimetableSlot from '../models/TimetableSlot.js';

export const createTimetableSlot = async (slotData) => {
  const { day, timePeriod, teacher, class: classId, room } = slotData;

  // 1. Hubi Isku-dhaca Macallinka (Teacher Conflict)
  const teacherConflict = await TimetableSlot.findOne({ day, timePeriod, teacher });
  if (teacherConflict) {
    throw new Error('Macallinkani wuxuu leeyahay xiisad kale isla maalinkan iyo waqtigaan!');
  }

  // 2. Hubi Isku-dhaca Fasalka (Class Conflict)
  const classConflict = await TimetableSlot.findOne({ day, timePeriod, class: classId });
  if (classConflict) {
    throw new Error('Fasalkani wuxuu leeyahay xiisad kale oo u qorsheysan waqtigaan!');
  }

  // 3. Hubi Isku-dhaca Qolka (Room Conflict)
  const roomConflict = await TimetableSlot.findOne({ day, timePeriod, room });
  if (roomConflict) {
    throw new Error('Qolkan/Lab-kan aad dooratay waa mashquul waqtigaan, fasal kale ayaa dhex fadhiya!');
  }

  // Haddii nidaamku wax conflict ah waayo, si ammaan ah u kaydi xiisadda
  const newSlot = await TimetableSlot.create(slotData);
  
  // Soo celi xogta la kaydiyey iyadoo xiriirada la hubeeyey (Populate)
  return await TimetableSlot.findById(newSlot._id)
    .populate('teacher', 'name email') // Kaliya magaca iyo email-ka macallinka soo qaad
    .populate('subject', 'name code');  // Qaybta maaddada iyo code-keeda
};