
import { Service } from './types';

export const SERVICES: Service[] = [
  {
    id: '1',
    name: 'Corte de Cabelo',
    description: 'Tesoura ou máquina, com acabamento perfeito na navalha.',
    price: 20.0,
    duration: 30,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCD4RptFvymJZDEkLZfMwqmhcd_4f7zkFYVMIa7qEGmfvAoMtQimIv7hrUEV2OEnVBlB9HQTs8M0h8XYaxvMg2u5xa3tV8QmAmuMHwS0iuJsSN3vs-kspcMGI3AV5vKVvy6Ung0cWriRLz4lBHj-XcCL3zh0fIzRcRCZZ2q9kBzYfy5y5R7gm2bV94C2KuW45zOrmYTOW2-2HddWogTJsONXGSe3X8e5hQkvR8yNxDTinFszQCQzZP8OgKBcNnjBNXw7uNJXcAyP-PT'
  },
  {
    id: '2',
    name: 'Barba Completa',
    description: 'Modelagem, toalha quente e massagem facial relaxante.',
    price: 15.0,
    duration: 20,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZxLjMFWK0xxuFeG-K_vmcs7YFlRon3BIo4GORMtB1FNOTw63z5yInatq8sENF5RPOVF1-e-unnFABYWrahvx_ldhuD9HIasezPJUlZ6DIZWZ2otfJR6R7UoqoejIxiyjoLpKteLWUyamkN7DnWQ4W45YzaFLNb89odMgkHQi96VNQExFoPnO3iN2YGwLimRCI_kDgYyhqd41d-PBgkKisP8cdcMVnQ30QU_KjBByqqZVX7r8RSA4OE7y97Ypso8CbxEECx3kgMQ9R'
  },
  {
    id: '3',
    name: 'Pezinho',
    description: 'Acabamento do contorno do cabelo.',
    price: 10.0,
    duration: 10,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvYByM6ju2CjbwNDRm9RmCAHKYgF0kZLDCxyiDUJv3Q3PpL884sG9ZTSyCUXuexr-MwvArU8zSvMnwlcRMdE7DsvrJ5mA-Pw2CQJQvxofrvuA7c1X2L5wVHVFV0zZ47_Qey3ylP01VDSxTCT6Du7-gwW1f6iOVzM5EO8ufqcX9aI3b3gyFXpdDjSnOUGVkLgYjLOwodqskOtoRtUzGSSEHQmLTkP04GzdGonGWAkeQJNyZiAJUe59AjVEYvAvk-14f6WWnxyu2LyPl'
  },
  {
    id: '4',
    name: 'Sobrancelha',
    description: 'Design e limpeza dos contornos com navalha.',
    price: 10.0,
    duration: 10,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCvYByM6ju2CjbwNDRm9RmCAHKYgF0kZLDCxyiDUJv3Q3PpL884sG9ZTSyCUXuexr-MwvArU8zSvMnwlcRMdE7DsvrJ5mA-Pw2CQJQvxofrvuA7c1X2L5wVHVFV0zZ47_Qey3ylP01VDSxTCT6Du7-gwW1f6iOVzM5EO8ufqcX9aI3b3gyFXpdDjSnOUGVkLgYjLOwodqskOtoRtUzGSSEHQmLTkP04GzdGonGWAkeQJNyZiAJUe59AjVEYvAvk-14f6WWnxyu2LyPl'
  },
  {
    id: '5',
    name: 'Hidratação',
    description: 'Tratamento profundo para cabelos.',
    price: 30.0,
    duration: 20,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsJ9fLPDPYlVIXr3ibJLRRdxEf6FA1fq_4H9sNT3VFLx3OKqPIMwMVDt8GS6V5bCvwmkrOJD2FtlFb7ieFs_4mOyQ4iPgPzfWgo-mvW_0LTb2eqeMNTkES7koFP0epzr0FTypKeZ54izOshgN5F73LQ8eCi0Uu0h1p48L_dEQCkCK90_Q1TF6iI5JJWdB5RwEMFNGYPUnwHxNxq5Toi85j-FrC50daezUz1mvfweQ2SifaKxEyF-wJXqhJhwwtYr30oaCWg_XGO1Mf'
  },
  {
    id: '6',
    name: 'Cabelo / Barba / Sobrancelha',
    description: 'Pacote completo para visual renovado.',
    price: 35.0,
    duration: 60,
    popular: true,
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsJ9fLPDPYlVIXr3ibJLRRdxEf6FA1fq_4H9sNT3VFLx3OKqPIMwMVDt8GS6V5bCvwmkrOJD2FtlFb7ieFs_4mOyQ4iPgPzfWgo-mvW_0LTb2eqeMNTkES7koFP0epzr0FTypKeZ54izOshgN5F73LQ8eCi0Uu0h1p48L_dEQCkCK90_Q1TF6iI5JJWdB5RwEMFNGYPUnwHxNxq5Toi85j-FrC50daezUz1mvfweQ2SifaKxEyF-wJXqhJhwwtYr30oaCWg_XGO1Mf'
  }
];

export const BUSINESS_HOURS = {
  weekday: '10:00 - 20:00',
  saturday: '10:00 - 20:00',
  address: 'Shopping da Vila, Centro, Delmiro Gouveia - AL'
};
