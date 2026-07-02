import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char: string) => {
      switch (char) {
        case '\n':
        case '\r':
        case '':
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(input);
          break;
        case '': // Ctrl+C
          process.stdout.write('\n');
          process.exit(1);
          break;
        case '': // backspace
          input = input.slice(0, -1);
          break;
        default:
          input += char;
          break;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('👑 Crear / actualizar SUPERADMIN\n');

  const email = (await ask('Email: ')).toLowerCase();
  if (!email.includes('@')) throw new Error('Email inválido');

  const name = await ask('Nombre: ');
  if (!name) throw new Error('Nombre requerido');

  const password = await askHidden('Password (min 8 caracteres): ');
  if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');

  const passwordConfirm = await askHidden('Confirmar password: ');
  if (password !== passwordConfirm) throw new Error('Las contraseñas no coinciden');

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, password: hashed, role: 'SUPERADMIN', isActive: true, tenantId: null },
    create: { email, name, password: hashed, role: 'SUPERADMIN', tenantId: null },
  });

  console.log(`\n✅ Superadmin listo: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error('\n❌', e.message ?? e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
