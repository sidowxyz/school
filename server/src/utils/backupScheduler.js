import { exec } from 'child_process';
import cron from 'node-cron';
import path from 'path';
import fs from 'fs';

export const initBackupScheduler = () => {
  // ⏰ Jadwalku wuxuu u rorayaa si otomaatig ah maalin walba 12-ka habeenimo (0 0 * * *)
  cron.schedule('0 0 * * *', () => {
    console.log('⏰ Bilaabidda koobiyeynta otomaatigga ah ee Database-ka...');

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ Backup-ku wuxuu u fashilmay: MONGO_URI lagama helin .env');
      return;
    }

    // Samee folder-ka "backups" haddii uusan horay u jirin
    const backupFolder = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupFolder)) {
      fs.mkdirSync(backupFolder, { recursive: true });
    }

    // Samee magac wata taariikhda iyo saacadda maanta
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupFolder, `backup-${timestamp}`);

    // Amarka mongodump ee xogta soo saaraya
    const command = `mongodump --uri="${mongoUri}" --out="${backupPath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Khalad ayaa ka dhacay sameynta Backup-ka: ${error.message}`);
        return;
      }
      console.log(`✅ Database-ka waxaa si guul leh loogu koobiyey: ${backupPath}`);
    });
  });
};