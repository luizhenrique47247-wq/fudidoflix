/**
 * TMDB API Service & Expanded Fallback Catalog Provider
 */

// Key Storage key
const TMDB_KEY_STORAGE = 'megacine_tmdb_api_key';

export const getStoredApiKey = () => {
  return localStorage.getItem(TMDB_KEY_STORAGE) || '';
};

export const setStoredApiKey = (key) => {
  if (key) {
    localStorage.setItem(TMDB_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(TMDB_KEY_STORAGE);
  }
};

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/original';

// Comprehensive local catalog for instant offline/fallback use
const EXPANDED_CATALOG = [
  {
    id: 60625,
    imdb_id: 'tt2861424',
    title: 'Rick e Morty',
    original_title: 'Rick and Morty',
    media_type: 'tv',
    vote_average: 8.7,
    release_date: '2013-12-02',
    poster_path: '/gd9939u0zobV7e1u01mKOf3qS0n.jpg',
    backdrop_path: '/u6k52o6wG7g8N6uGvR6uG.jpg',
    overview: 'O brilhante e alcoólatra cientista Rick viaja pelo espaço-tempo levando seu neto ansioso Morty em aventuras intergalácticas bizarras e perigosas.',
    genre_ids: [16, 35, 878],
    trailer_key: 'hl1U019e07M'
  },
  {
    id: 299534,
    imdb_id: 'tt4154796',
    title: 'Vingadores: Ultimato',
    original_title: 'Avengers: Endgame',
    media_type: 'movie',
    vote_average: 8.3,
    release_date: '2019-04-24',
    poster_path: '/9fRX8UKlIW7Lb9GqNsJVakWWFCi.jpg',
    backdrop_path: '/dVSMKPEaiwujXE7kQkvixPLieHR.jpg',
    overview: 'Após os eventos devastadores de Guerra Infinita, o universo está em ruínas. Com a ajuda de aliados remanescentes, os Vingadores se reúnem a fim de desfazer as ações de Thanos.',
    genre_ids: [28, 12, 878],
    trailer_key: 'spJoZReeIeQ'
  },
  {
    id: 94997,
    imdb_id: 'tt14230458',
    title: 'A Casa do Dragão',
    original_title: 'House of the Dragon',
    media_type: 'tv',
    vote_average: 8.4,
    release_date: '2022-08-21',
    poster_path: '/xEC4nyJvcWcOu7QaobLcqz6iRUL.jpg',
    backdrop_path: '/577eXC8wFQT0eUrJcgznSiFPRmk.jpg',
    overview: '200 anos antes dos eventos de Game of Thrones, os Targaryen estavam no ápice de seu poder com inúmeros dragões sob seu comando, mas a guerra civil ameaça a dinastia.',
    genre_ids: [10759, 18, 10765],
    trailer_key: 'DotnJ7tTA34'
  },
  {
    id: 66732,
    imdb_id: 'tt4574334',
    title: 'Stranger Things',
    original_title: 'Stranger Things',
    media_type: 'tv',
    vote_average: 8.6,
    release_date: '2016-07-15',
    poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdrop_path: '/56v2Kj2RCUtL3GsPJmhkEFiMSc.jpg',
    overview: 'Quando um garoto desaparece, a cidade descobre um mistério envolvendo experimentos secretos, forças sobrenaturais aterrorizantes e uma garota estranha.',
    genre_ids: [18, 10765, 9648],
    trailer_key: 'b9EkMc79ZSU'
  },
  {
    id: 1396,
    imdb_id: 'tt0903747',
    title: 'Breaking Bad: A Química do Mal',
    original_title: 'Breaking Bad',
    media_type: 'tv',
    vote_average: 8.9,
    release_date: '2008-01-20',
    poster_path: '/ztkUQFLlC19CCMYHW9oUtToOGyu.jpg',
    backdrop_path: '/tsRy63MuZvE8etMtGdoPZyoLEn1.jpg',
    overview: 'Um professor de química do ensino médio diagnosticado com câncer inoperável se junta a um ex-aluno para fabricar e vender metanfetamina.',
    genre_ids: [18, 80],
    trailer_key: 'HhesaQXLuRY'
  },
  {
    id: 575264,
    imdb_id: 'tt6791096',
    title: 'Duna: Parte 2',
    original_title: 'Dune: Part Two',
    media_type: 'movie',
    vote_average: 8.6,
    release_date: '2024-02-27',
    poster_path: '/6h1d7jY11Wv7h0WcWn1mJ0eP.jpg',
    backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s52L3j2.jpg',
    overview: 'Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.',
    genre_ids: [878, 12],
    trailer_key: 'Way9Dexny3w'
  },
  {
    id: 634649,
    imdb_id: 'tt10872600',
    title: 'Homem-Aranha: Sem Volta Para Casa',
    original_title: 'Spider-Man: No Way Home',
    media_type: 'movie',
    vote_average: 8.0,
    release_date: '2021-12-15',
    poster_path: '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg',
    backdrop_path: '/iQFcwG2r6H8vMtE9rYv1z.jpg',
    overview: 'Peter Parker pede ajuda ao Doutor Estranho para fazer com que todos esqueçam sua identidade, mas o feitiço rasga o multiverso.',
    genre_ids: [28, 12, 878],
    trailer_key: 'JfVOs4VSpmA'
  },
  {
    id: 414906,
    imdb_id: 'tt1877830',
    title: 'Batman',
    original_title: 'The Batman',
    media_type: 'movie',
    vote_average: 7.7,
    release_date: '2022-03-01',
    poster_path: '/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    backdrop_path: '/t5xCv7v7p2p0W72XNfX1r60C85J.jpg',
    overview: 'Batman investiga a corrupção oculta de Gotham City enquanto persegue o Charada, um serial killer enigmático.',
    genre_ids: [80, 9648, 53],
    trailer_key: 'mqqft2x_Aa4'
  },
  {
    id: 1022789,
    imdb_id: 'tt22022452',
    title: 'Divertida Mente 2',
    original_title: 'Inside Out 2',
    media_type: 'movie',
    vote_average: 7.6,
    release_date: '2024-06-11',
    poster_path: '/xh97lFk44m4kL1f60C85J.jpg',
    backdrop_path: '/stKGOm9UyGgR3mPz.jpg',
    overview: 'Com a chegada da adolescência de Riley, a sala de controle mental passa por uma reforma para abrir espaço para novas emoções, incluindo a Ansiedade.',
    genre_ids: [16, 35, 10751],
    trailer_key: 'LEjhY15eCx0'
  },
  {
    id: 533535,
    imdb_id: 'tt6263850',
    title: 'Deadpool & Wolverine',
    original_title: 'Deadpool & Wolverine',
    media_type: 'movie',
    vote_average: 7.7,
    release_date: '2024-07-24',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop_path: '/yDHYTfA3R0jFYba16jBB12.jpg',
    overview: 'Deadpool se une ao relutante Wolverine para alterar a história do Universo Cinematográfico Marvel.',
    genre_ids: [28, 35, 878],
    trailer_key: '73_1biulkYk'
  },
  {
    id: 76479,
    imdb_id: 'tt1190634',
    title: 'The Boys',
    original_title: 'The Boys',
    media_type: 'tv',
    vote_average: 8.5,
    release_date: '2019-07-25',
    poster_path: '/stTEycfG9928HYGEISBFaG1ngjM.jpg',
    backdrop_path: '/mAh941312e9999aac85c8d55346.jpg',
    overview: 'Um grupo de vigilantes se propõe a derrubar super-heróis corruptos que abusam de seus superpoderes.',
    genre_ids: [10759, 10765],
    trailer_key: '06rueu_fh30'
  },
  {
    id: 119051,
    imdb_id: 'tt13443470',
    title: 'Wandinha',
    original_title: 'Wednesday',
    media_type: 'tv',
    vote_average: 8.4,
    release_date: '2022-11-23',
    poster_path: '/9PFNm2j215iW29h.jpg',
    backdrop_path: '/iHSwvR6vXfGg.jpg',
    overview: 'Inteligente, sarcástica e um pouco morta por dentro, Wandinha Addams investiga uma onda de assassinatos na Escola Nunca Mais.',
    genre_ids: [35, 10765, 9648],
    trailer_key: 'Q73UhUTs6y0'
  },
  {
    id: 808,
    imdb_id: 'tt0126029',
    title: 'Shrek',
    original_title: 'Shrek',
    media_type: 'movie',
    vote_average: 7.7,
    release_date: '2001-05-18',
    poster_path: '/iB64vpL3dIObOtMZgX3udE7spzB.jpg',
    backdrop_path: '/sRvXNDmGlWhEvw5W6f.jpg',
    overview: 'Um ogro ranzinza tem seu pântano invadido por criaturas de contos de fadas e faz um acordo com o Lorde Farquaad para resgatar uma princesa.',
    genre_ids: [16, 35, 14],
    trailer_key: 'CwXOrWvPBPk'
  },
  {
    id: 94605,
    imdb_id: 'tt11126994',
    title: 'Arcane',
    original_title: 'Arcane',
    media_type: 'tv',
    vote_average: 8.7,
    release_date: '2021-11-06',
    poster_path: '/fqld2gZUtNycflRj.jpg',
    backdrop_path: '/q8h2x2984k19.jpg',
    overview: 'Em meio ao conflito entre as cidades-gêmeas de Piltover e Zaun, duas irmãs lutam em lados opostos de uma guerra entre tecnologias mágicas e convicções incompatíveis.',
    genre_ids: [16, 10765, 10759],
    trailer_key: 'fXmAurh012s'
  },
  {
    id: 823464,
    imdb_id: 'tt14539740',
    title: 'Godzilla e Kong: O Novo Império',
    original_title: 'Godzilla x Kong: The New Empire',
    media_type: 'movie',
    vote_average: 7.2,
    release_date: '2024-03-27',
    poster_path: '/bVO5407Vq2p0W72XNfX1r60C85J.jpg',
    backdrop_path: '/xOMo8BRK7PfcJv9JCnx7s52L3j2.jpg',
    overview: 'O poderoso Kong e o temível Godzilla devem se unir contra uma colossal ameaça desconhecida escondida em nosso mundo.',
    genre_ids: [28, 878, 12],
    trailer_key: 'qqrpMRDuTEo'
  },
  {
    id: 111110,
    imdb_id: 'tt13159924',
    title: 'Avatar: O Último Mestre do Ar',
    original_title: 'Avatar: The Last Airbender',
    media_type: 'tv',
    vote_average: 8.0,
    release_date: '2024-02-22',
    poster_path: '/zCz483fU94RxRt1gdGW1rxQkcID.jpg',
    backdrop_path: '/gJL5kp5FMwaB0fD2vJBvjCjG5.jpg',
    overview: 'Um garoto conhecido como o Avatar deve dominar os quatro elementos para salvar o mundo e combater um inimigo implacável.',
    genre_ids: [10759, 10765, 16],
    trailer_key: 'byQab5a3sEE'
  },
  {
    id: 693134,
    imdb_id: 'tt15398776',
    title: 'Oppenheimer',
    original_title: 'Oppenheimer',
    media_type: 'movie',
    vote_average: 8.1,
    release_date: '2023-07-19',
    poster_path: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop_path: '/fm6K8O2w9yB2mPcLF8yRj9x.jpg',
    overview: 'A história do físico americano J. Robert Oppenheimer, seu papel no Projeto Manhattan e o desenvolvimento da bomba atômica.',
    genre_ids: [18, 36],
    trailer_key: 'F3OxA9Cz17A'
  }
];

export const getImageUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80';
  return path.startsWith('http') ? path : `${IMAGE_BASE_URL}${path}`;
};

export const getBackdropUrl = (path) => {
  if (!path) return 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1920&q=80';
  return path.startsWith('http') ? path : `${BACKDROP_BASE_URL}${path}`;
};

export const fetchTrending = async () => {
  const apiKey = getStoredApiKey();
  if (apiKey) {
    try {
      const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${apiKey}&language=pt-BR`);
      if (res.ok) {
        const data = await res.json();
        return data.results.map(formatMediaData);
      }
    } catch (err) {
      console.warn('API TMDB falhou, ativando catálogo local inteligente:', err);
    }
  }
  return EXPANDED_CATALOG;
};

export const fetchMovies = async (genreId = null) => {
  const apiKey = getStoredApiKey();
  if (apiKey) {
    try {
      let url = `${BASE_URL}/movie/popular?api_key=${apiKey}&language=pt-BR&page=1`;
      if (genreId && genreId !== 'all') {
        url = `${BASE_URL}/discover/movie?api_key=${apiKey}&language=pt-BR&with_genres=${genreId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.results.map(item => formatMediaData({ ...item, media_type: 'movie' }));
      }
    } catch (err) {
      console.warn('API TMDB falhou:', err);
    }
  }

  let movies = EXPANDED_CATALOG.filter(i => i.media_type === 'movie');
  if (genreId && genreId !== 'all') {
    const gid = parseInt(genreId);
    movies = movies.filter(m => m.genre_ids && m.genre_ids.includes(gid));
  }
  return movies;
};

export const fetchTVShows = async () => {
  const apiKey = getStoredApiKey();
  if (apiKey) {
    try {
      const res = await fetch(`${BASE_URL}/tv/popular?api_key=${apiKey}&language=pt-BR&page=1`);
      if (res.ok) {
        const data = await res.json();
        return data.results.map(item => formatMediaData({ ...item, media_type: 'tv' }));
      }
    } catch (err) {
      console.warn('API TMDB falhou:', err);
    }
  }
  return EXPANDED_CATALOG.filter(i => i.media_type === 'tv');
};

// Normalize text for smart fuzzy search (removes accents, case insensitive)
const normalizeText = (text) => {
  return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

export const searchCatalog = async (query) => {
  if (!query || query.trim() === '') return [];

  const apiKey = getStoredApiKey();
  if (apiKey) {
    try {
      const res = await fetch(`${BASE_URL}/search/multi?api_key=${apiKey}&language=pt-BR&query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.results
          .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
          .map(formatMediaData);
        if (results.length > 0) return results;
      }
    } catch (err) {
      console.warn('Busca via API TMDB falhou, buscando no catálogo local:', err);
    }
  }

  // Local Smart Search
  const q = normalizeText(query);
  return EXPANDED_CATALOG.filter(item => {
    const title = normalizeText(item.title);
    const origTitle = normalizeText(item.original_title);
    const overview = normalizeText(item.overview);
    return title.includes(q) || origTitle.includes(q) || overview.includes(q);
  });
};

const formatMediaData = (item) => {
  return {
    id: item.id,
    imdb_id: item.imdb_id || `tt${item.id}`,
    title: item.title || item.name || item.original_title || item.original_name,
    original_title: item.original_title || item.original_name || '',
    media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
    vote_average: item.vote_average ? Number(item.vote_average.toFixed(1)) : 8.5,
    release_date: item.release_date || item.first_air_date || '2024',
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    overview: item.overview || 'Sinopse completa disponível para reprodução.',
    genre_ids: item.genre_ids || [],
    trailer_key: item.trailer_key || 'spJoZReeIeQ'
  };
};
