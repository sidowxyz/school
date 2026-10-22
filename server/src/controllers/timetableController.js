import { createTimetableSlot } from '../services/timetableService.js';

export const addTimetableSlot = async (req, res) => {
  try {
    // U gudbi xogta laga soo diray Body-ga nidaamka Service-ka
    const savedSlot = await createTimetableSlot(req.body);

    // Haddii wax conflict ah la waayo, guul!
    return res.status(201).json({
      success: true,
      message: 'Xiisadda jadwalka si guul leh ayaa loo qorsheeyey! 📅',
      data: savedSlot
    });
    
  } catch (error) {
    // Halkan waxaa lagu soo qabanayaa khaladaadkii ka dhashay isku-dhacyada (Conflict Errors)
    return res.status(400).json({
      success: false,
      message: error.message // Wuxuu soo celinayaa fariintii saxda ahayd ee aan Service-ka ku soo qornay
    });
  }
};