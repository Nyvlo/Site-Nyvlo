
import { DatabaseService } from '../services/database-service';
import { LogService } from '../services/log-service';
import * as bcrypt from 'bcryptjs';

async function resetAdminPassword() {
    const logger = new LogService();
    const db = new DatabaseService(logger);

    try {
        await db.initialize();

        const plainPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        const username = 'admin';

        // Update web_users
        await db.run(
            `UPDATE web_users SET password_hash = ? WHERE username = ?`,
            [hashedPassword, username]
        );

        // Also update admins table if it exists and is used separately
        await db.run(
            `UPDATE admins SET password_hash = ? WHERE username = ?`,
            [hashedPassword, username]
        );

        console.log(`✅ Senha do usuário '${username}' resetada para '${plainPassword}' com sucesso!`);

    } catch (error) {
        console.error('Erro ao resetar senha:', error);
    } finally {
        await db.close();
        process.exit(0);
    }
}

resetAdminPassword();
