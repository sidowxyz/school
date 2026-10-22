/**
 * @desc Utility si otomaatig ah loogu xisaabiyo darajooyinka iskuulka
 */
export const calculateGrade = (caMarks = 0, examMarks = 0) => {
  // Isku gee labada dhibcood adoo u beddelaya Number si ammaan ah
  const totalMarks = Number(caMarks) + Number(examMarks);

  if (totalMarks >= 90) return { grade: 'A', remarks: 'Excellent' };
  if (totalMarks >= 80) return { grade: 'B', remarks: 'Very Good' };
  if (totalMarks >= 70) return { grade: 'C', remarks: 'Good' };
  if (totalMarks >= 60) return { grade: 'D', remarks: 'Pass' };
  if (totalMarks >= 50) return { grade: 'E', remarks: 'Fair' };
  
  return { grade: 'F', remarks: 'Fail' };
};