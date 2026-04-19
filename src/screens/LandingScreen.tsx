import React from 'react';
import { motion } from 'framer-motion';

interface LandingScreenProps {
  onStart: () => void;
  onAdmin: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onStart, onAdmin }) => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f7f4ec] text-slate-800 transition-colors scroll-smooth">
      {/* Navigation */}
      <nav className="w-full flex justify-center pt-6 md:pt-10 px-3 md:px-8">
        <div className="max-w-5xl w-full flex flex-row items-end gap-2 sm:gap-4 md:gap-6 relative">
          
          {/* Logo block */}
          <div className="flex-shrink-0 h-[38px] sm:h-[46px] md:h-20 flex items-center justify-center pb-1 md:pb-0 -translate-y-[1px]">
            <img 
              src="/logo-icon.webp" 
              alt="Logo Adriana" 
              className="h-full w-auto object-contain" 
              onError={e => (e.currentTarget.src = '/logo-icon.png')} 
            />
          </div>
          
          <div className="flex-1 flex flex-col justify-end w-full h-auto md:h-20 relative px-0 md:px-4">
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center justify-between gap-3 lg:gap-5 text-[#a38779] font-sans font-bold text-sm lg:text-base tracking-wide pb-3 w-full whitespace-nowrap">
              <a href="#quem-sou-eu" className="hover:opacity-70 transition-opacity">quem sou eu</a>
              <span className="text-[#a38779]/40 font-light flex-shrink-0">|</span>
              <a href="#clube" className="hover:opacity-70 transition-opacity">clube do cabelo perfeito</a>
              <span className="text-[#a38779]/40 font-light flex-shrink-0">|</span>
              <button onClick={onStart} className="hover:opacity-70 transition-opacity border-none bg-transparent m-0 p-0 font-bold">agendamento</button>
              <span className="text-[#a38779]/40 font-light flex-shrink-0">|</span>
              <a href="#contato" className="hover:opacity-70 transition-opacity">contatos</a>
            </div>

            {/* Mobile Navigation */}
            <div className="grid md:hidden grid-cols-[1fr_auto_1.2fr] gap-y-2 pb-2 text-[#a38779] font-sans font-bold text-[11px] sm:text-[13px] tracking-tight w-full items-center text-center mt-2">
               <a href="#quem-sou-eu" className="hover:opacity-70 px-1 leading-tight w-full text-center">quem sou eu</a>
               <span className="text-[#a38779]/30 font-light translate-y-[1px]">|</span>
               <a href="#clube" className="hover:opacity-70 px-1 leading-tight w-full text-center whitespace-nowrap overflow-hidden text-ellipsis">clube do cabelo perfeito</a>
               
               <button onClick={onStart} className="hover:opacity-70 font-bold px-1 leading-tight w-full text-center">agendamento</button>
               <span className="text-[#a38779]/30 font-light translate-y-[1px]">|</span>
               <a href="#contato" className="hover:opacity-70 px-1 leading-tight w-full text-center">contatos</a>
            </div>

            <div className="w-full h-[1.5px] bg-[#a38779]/30 absolute bottom-0 left-0"></div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full flex flex-col items-center justify-start pt-4 pb-20 px-4 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, x: "-50%" }}
          animate={{ opacity: 0.1, scale: 1, x: "-50%" }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-20 left-1/2 w-[90%] md:w-[60%] max-w-[600px] pointer-events-none z-0"
        >
          <img 
            src="/logo-icon.webp" 
            alt="" 
            className="w-full h-auto object-contain" 
            onError={e => (e.currentTarget.src = '/logo-icon.png')} 
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="relative z-10 w-full max-w-[450px] mx-auto"
        >
          <div className="w-full flex justify-center relative min-h-[300px]">
             <img 
               src="/adriana-photo.webp" 
               alt="Adriana" 
               className="w-full h-auto drop-shadow-2xl relative z-10" 
               onError={e => (e.currentTarget.src = '/adriana-photo.png')} 
             />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
          className="relative z-20 w-full max-w-[380px] mx-auto -mt-24 md:-mt-32 mb-12 flex flex-col items-center"
        >
          <img 
            src="/logo-text.webp" 
            alt="Adriana Coiffeur" 
            className="w-full h-auto drop-shadow-lg" 
            onError={e => (e.currentTarget.src = '/logo-text.png')} 
          />
          <p className="font-sans font-light tracking-[0.1em] text-[#a38779]/80 text-[10px] md:text-[11px] uppercase mt-2 md:mt-4 whitespace-nowrap">
            Há 20 anos realçando belezas únicas!
          </p>
        </motion.div>

        <motion.button 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStart} 
          className="relative z-20 px-10 py-3 border border-[#a38779] text-[#a38779] text-lg tracking-[0.2em] uppercase bg-transparent hover:bg-[#a38779]/5 transition-all shadow-sm"
        >
          agende aqui
        </motion.button>
      </section>

      {/* About Section */}
      <section id="quem-sou-eu" className="w-full bg-[#f7f4ec] py-[80px] px-0 overflow-hidden">
        <div className="w-full flex flex-col gap-[30px] md:gap-[60px]">
          <div className="grid grid-cols-[minmax(0,21.43%)_minmax(0,37.94%)_minmax(0,21.43%)] gap-[9.58%] w-full items-center text-center px-0">
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img src="/tesouraepente.webp" alt="Tools" className="w-full h-full object-cover grayscale" onError={e => (e.currentTarget.src = '/tesouraepente.png')} />
            </div>
            <div className="w-full flex items-center justify-center h-full">
              <div className="flex flex-col items-center justify-center gap-1 md:gap-3 w-full bg-[#f7f4ec]">
                <p className="text-[#a38779] font-sans text-[10px] sm:text-[12px] md:text-[15px] leading-snug md:leading-[1.4] tracking-normal md:tracking-wide">
                  <span className="font-bold">Adriana Coiffeur</span> é hair stylist,<br />
                  visagista, mentora e consultora<br />
                  de cor, com mais de 20 anos de<br />
                  experiência no cuidado e<br />
                  transformação de cabelos,<br />
                  realçando belezas únicas.
                </p>
                <div className="h-2" />
                <p className="text-[#a38779] font-sans text-[10px] sm:text-[12px] md:text-[15px] leading-snug md:leading-[1.4] tracking-normal md:tracking-wide">
                  Sua atuação é baseada em<br />
                  técnica, planejamento e<br />
                  acompanhamento contínuo,<br />
                  respeitando a identidade, o<br />
                  cabelo, a personalidade, o<br />
                  estilo de vida e a rotina<br />
                  de cada cliente.
                </p>
              </div>
            </div>
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img src="/adrianaassinando.webp" alt="Adriana Assinando" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = '/adrianaassinando.png')} />
            </div>
          </div>

          <div className="grid grid-cols-[21.43%_37.94%_21.43%] gap-[9.58%] items-stretch">
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img src="/gallery-1.webp" alt="Produtos" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = '/gallery-1.png')} />
            </div>
            <div className="aspect-[409.84/644.85] w-full overflow-hidden">
              <img src="/gallery-2.webp" alt="Foco" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = '/gallery-2.png')} />
            </div>
            <div className="aspect-[231.53/432.91] w-full overflow-hidden">
              <img src="/gallery-3.webp" alt="Eventos" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = '/gallery-3.png')} />
            </div>
          </div>
        </div>
      </section>

      {/* Club Section */}
      <section id="clube" className="w-full bg-[#040404] text-[#f7f4ec] py-[80px] px-6 md:px-12 relative z-10 overflow-hidden text-center">
        <div className="absolute inset-x-0 top-0 h-[250px] md:h-[400px] bg-gradient-to-b from-[#f7f4ec] to-[#040404] -z-10" />
        <div className="w-full flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="w-full max-w-[500px] md:max-w-[700px] mx-auto relative z-20 mb-12 md:mb-20"
          >
            <div className="absolute inset-x-0 top-[78%] md:top-[82%] flex justify-center z-30 h-28 md:h-40 px-4 drop-shadow-2xl">
              <img src="/clube-logo.png" alt="Logo Clube" className="h-full w-auto object-contain" />
            </div>
            <img src="/club-photo.webp" alt="Clube" className="w-full h-auto object-cover relative z-0" onError={e => (e.currentTarget.src = '/club-photo.png')} />
          </motion.div>
        </div>
          
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[14px] md:text-[16px] leading-[1.6] mb-8 font-light max-w-[440px] text-[#a38779] font-sans tracking-wide mx-auto text-center px-4"
        >
          <span className="font-bold">O Clube do Cabelo Perfeito</span> existe para<br />
          facilitar a sua rotina de cuidados.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="w-full h-24 md:h-32 mb-8 md:mb-12 overflow-hidden"
        >
          <img src="/ao entrar no clube.webp" alt="Entrar no Clube" className="h-full w-auto mx-auto object-contain" onError={e => (e.currentTarget.src = '/ao entrar no clube.png')} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="border border-[#a38779]/30 p-8 md:p-12 w-full max-w-lg text-left bg-[#040404]/50 backdrop-blur-sm mx-auto"
        >
          <ul className="space-y-4 text-[#a38779]/90 font-light text-[13px] md:text-[15px] tracking-wide">
            {[ "Planejamento de cuidados", "Procedimentos organizados", "Acompanhamento técnico", "Prioridade no agendamento" ].map((item, idx) => (
              <li key={idx} className="flex items-start gap-4">
                <span className="material-symbols-outlined text-[#a38779] text-lg shrink-0 mt-0.5">diamond</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* Footer */}
      <div id="contato" className="w-full bg-[#040404] border-t border-[#a38779]/10 pt-16 pb-8 px-4 flex flex-col items-center">
         <div className="text-center mb-12">
            <h4 className="text-[#a38779] tracking-widest uppercase text-sm mb-4">Contato</h4>
            <div className="flex flex-col gap-2 text-[#f7f4ec]/70 font-light text-sm">
               <p>(82) 99312-5883</p>
               <p>@adrianacoiffeur</p>
            </div>
         </div>
        <button onClick={onAdmin} className="text-[#a38779]/30 hover:text-[#a38779] text-[10px] tracking-widest uppercase flex items-center gap-2 transition-colors">
          <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
          Acesso Administrativo
        </button>
      </div>
    </div>
  );
};

export default LandingScreen;
