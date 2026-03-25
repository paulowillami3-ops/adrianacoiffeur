require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- Configuração via .env ou hardcoded para simplicidade neste ambiente dev ---
if (!process.env.VITE_SUPABASE_URL) {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    } catch (e) {
        console.log('Não foi possível ler .env da raiz, verifique as configurações.');
    }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('ERRO: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidos no .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Mude para false se quiser ver o navegador abrindo (debug)
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('generated-qr-code:', qr); // Usado para feedback visual se necessário
    qrcode.generate(qr, { small: true });
    console.log('\n>>> ESCANEIE O QR CODE ACIMA COM O SEU WHATSAPP <<<\n');
});

client.on('ready', () => {
    console.log('✅ Cliente do WhatsApp conectado e pronto!');
    console.log('🤖 Robô de Lembretes iniciado (Modo: 1 hora de antecedência)...');

    // Iniciar verificação a cada 1 minuto
    setInterval(checkAppointments, 60000);
    checkAppointments(); // Executar imediatamente ao iniciar
});

client.on('authenticated', () => {
    console.log('Autenticado com sucesso!');
});

client.initialize();

async function checkAppointments() {
    console.log(`[${new Date().toLocaleTimeString()}] Verificando agendamentos...`);

    const now = new Date();
    // Janela de tempo: agendamentos entre 55 e 65 minutos a partir de agora (1 hora)
    const startWindow = new Date(now.getTime() + 55 * 60000);
    const endWindow = new Date(now.getTime() + 65 * 60000);

    const startStr = startWindow.toISOString();

    // Simplificação: Pegar agendamentos do DIA e filtrar por hora no código para lidar com fusos e strings
    // Assumindo que appointment_date é YYYY-MM-DD e appointment_time é HH:MM:SS
    const today = now.toISOString().split('T')[0];

    // Buscamos agendamentos de HOJE que ainda não foram notificados
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            id,
            appointment_date,
            appointment_time,
            customerName:clients(name, phone),
            status,
            notification_sent
        `)
        .eq('appointment_date', today)
        .eq('status', 'CONFIRMED')
        .eq('notification_sent', false);

    if (error) {
        console.error('Erro ao buscar agendamentos:', error);
        return;
    }

    if (!appointments || appointments.length === 0) return;

    for (const app of appointments) {
        // Combinar Data e Hora para objeto Date
        const appDateTimeStr = `${app.appointment_date}T${app.appointment_time}`;
        const appDate = new Date(appDateTimeStr);

        // Calcular diferença em minutos
        const diffMs = appDate.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        // Se faltar entre 55 e 65 minutos (nosso alvo é 60)
        if (diffMins >= 55 && diffMins <= 65) {
            console.log(`💡 Agendamento encontrado para notificar: ${app.customerName?.name} às ${app.appointment_time} (Faltam ${diffMins} min)`);
            await sendReminder(app);
        }
    }
}

async function sendReminder(app) {
    const phone = app.customerName?.phone;
    if (!phone) {
        console.warn(`⚠️ Cliente sem telefone: ${app.customerName?.name} (ID: ${app.id})`);
        return;
    }

    // Formatar telefone para padrão internacional (BR) se não estiver
    let cleanPhone = phone.replace(/\D/g, '');

    // Se não tiver código do país (55), adiciona
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        cleanPhone = '55' + cleanPhone;
    }

    const chatId = `${cleanPhone}@c.us`;
    const message = `Olá, ${app.customerName?.name || 'Cliente'}! 👋\n\nPassando para lembrar do seu agendamento na *RS Barbearia* daqui a 1 hora, às *${app.appointment_time.slice(0, 5)}*.\n\nEstamos te esperando! ✂️💈`;

    try {
        // Tenta resolver o ID correto do WhatsApp para evitar "No LID" error
        let finalId = chatId;
        try {
            const numberDetails = await client.getNumberId(chatId);
            if (numberDetails) {
                finalId = numberDetails._serialized;
            } else {
                console.log(`⚠️ Número não registrado no WhatsApp ou erro de busca: ${chatId}. Tentando envio direto...`);
            }
        } catch (resolveError) {
            console.log('Erro ao resolver ID, tentando envio direto...');
        }

        await client.sendMessage(finalId, message);
        console.log(`✅ Mensagem enviada para ${cleanPhone}`);

        // Marcar como enviado no banco
        const { error } = await supabase
            .from('appointments')
            .update({ notification_sent: true })
            .eq('id', app.id);

        if (error) console.error('Erro ao atualizar status no banco:', error);

    } catch (err) {
        console.error(`❌ Falha ao enviar para ${cleanPhone}:`, err);
    }
}
