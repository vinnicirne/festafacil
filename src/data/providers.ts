import type { Service } from '@/components/ServiceCard'

export const providers: Service[] = [
  {
    id: '1',
    name: 'Castelo Inflável Divertix',
    category: 'Brinquedos',
    priceFrom: 250,
    rating: 4.8,
    ratingCount: 32,
    mainImage: 'https://images.unsplash.com/photo-1503708928676-1cb796a0891e?q=80&w=1200&auto=format&fit=crop',
    radiusKm: 30,
    hasCNPJ: true,
    includesMonitor: true,
    cepAreas: ['01234-000','05000-000']
  },
  {
    id: '2',
    name: 'Buffet Sabor de Festa',
    category: 'Buffet',
    priceFrom: 1200,
    rating: 4.9,
    ratingCount: 54,
    mainImage: 'https://images.unsplash.com/photo-1533777168198-6bde9a1edfd0?q=80&w=1200&auto=format&fit=crop',
    radiusKm: 50,
    hasCNPJ: true,
    includesMonitor: false,
    cepAreas: ['04000-000','06000-000']
  },
  {
    id: '3',
    name: 'Decora Tudo Festas',
    category: 'Decoração',
    priceFrom: 800,
    rating: 4.6,
    ratingCount: 19,
    mainImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop',
    radiusKm: 40,
    hasCNPJ: false,
    includesMonitor: false,
    cepAreas: ['07000-000']
  },
  {
    id: '4',
    name: 'AnimaKids Recreação',
    category: 'Recreação',
    priceFrom: 450,
    rating: 4.7,
    ratingCount: 25,
    mainImage: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=1200&auto=format&fit=crop',
    radiusKm: 35,
    hasCNPJ: true,
    includesMonitor: true,
    cepAreas: ['01234-000']
  },
  {
    id: '5',
    name: 'Bolos da Maria',
    category: 'Bolo',
    priceFrom: 180,
    rating: 4.5,
    ratingCount: 12,
    mainImage: 'https://images.unsplash.com/photo-1568051243858-01bc1294db1b?q=80&w=1200&auto=format&fit=crop',
    radiusKm: 20,
    hasCNPJ: false,
    includesMonitor: false,
    cepAreas: ['02000-000','03000-000']
  }
]