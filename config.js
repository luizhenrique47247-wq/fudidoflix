// Exporta a configuração das categorias para a PÁGINA INICIAL (NOVA ORDEM)
export const categories = {
    default: [
        { title: "Em Alta Hoje", endpoint: "/trending/all/day" },
        { title: "Últimos Assistidos", endpoint: "localstorage" }, // Identificador especial
        { title: "Séries Aclamadas pela Crítica", endpoint: "/tv/top_rated?vote_count.gte=1000" }, // Adicionado contagem de votos
        { title: "Filmes de Terror", endpoint: "/discover/movie?with_genres=27" },
        { title: "Filmes Suspense", endpoint: "/discover/movie?with_genres=53" }, // Gênero Thriller
        { title: "Filmes Populares", endpoint: "/movie/popular" },
        { title: "Animes", endpoint: "/discover/tv?with_genres=16&sort_by=popularity.desc" }, // Animação TV
        { title: "Documentários", endpoint: "/discover/movie?with_genres=99" },
        { title: "Originais e Exclusivos Netflix", endpoint: "/discover/tv?with_networks=213&language=pt-BR" }, // ID Netflix
        { title: "Originais e Exclusivos Prime Video", endpoint: "/discover/tv?with_networks=1024&language=pt-BR" }, // ID Prime Video
        { title: "Originais e Exclusivos Max", endpoint: "/discover/tv?with_networks=49&language=pt-BR" }, // ID HBO/Max
        { title: "Originais e Exclusivos Paramount+", endpoint: "/discover/tv?with_networks=4330&language=pt-BR" },// ID Paramount+
        { title: "Originais e Exclusivos Globoplay", endpoint: "/discover/tv?with_networks=3290&language=pt-BR" }, // ID Globoplay
        { title: "Originais e Exclusivos Disney+", endpoint: "/discover/tv?with_networks=2739&language=pt-BR" }, // ID Disney+
        { title: "Originais e Exclusivos Apple TV+", endpoint: "/discover/tv?with_networks=2552&language=pt-BR" }, // ID Apple TV+
        { title: "Filmes Brasileiros", endpoint: "/discover/movie?with_origin_country=BR&sort_by=popularity.desc" },
    ],
};

// IDs de Gênero do TMDB (para referência - mantidos)
// Filmes: 28: Ação, 12: Aventura, 16: Animação, 35: Comédia, 80: Crime, 99: Documentário,
// 18: Drama, 10751: Família, 14: Fantasia, 36: História, 27: Terror, 10402: Música,
// 9648: Mistério, 10749: Romance, 878: Ficção Científica, 10770: TV, 53: Thriller,
// 10752: Guerra, 37: Faroeste
//
// TV: 10759: Ação & Aventura, 16: Animação, 35: Comédia, 80: Crime, 99: Doc, 18: Drama,
// 10751: Família, 10762: Kids, 9648: Mistério, 10763: News, 10764: Reality,
// 10765: Sci-Fi & Fantasy, 10766: Soap, 10767: Talk, 10768: War & Politics, 37: Western


// Filtros personalizados para a página de Filmes (mantidos)
export const movieFilters = [
    { name: "Todos os Gêneros", type: "genre", value: "" },
    { name: "Ação e Aventura", type: "genre", value: "28,12" },
    { name: "Animação", type: "genre", value: "16" },
    { name: "Comédia", type: "genre", value: "35" },
    { name: "Criminal", type: "genre", value: "80" },
    { name: "Suspense", type: "genre", value: "53" },
    { name: "Terror", type: "genre", value: "27" },
    { name: "Drama", type: "genre", value: "18" },
    { name: "Romance", type: "genre", value: "10749" },
    { name: "Ficção-Científica e Fantasia", type: "genre", value: "878,14" },
    { name: "Mistério", type: "genre", value: "9648" },
    { name: "Policial", type: "genre", value: "80" }, // Reutilizando "Criminal"
    { name: "Disney e Pixar", type: "company", value: "2|3" },
    { name: "Brasileiros", type: "country", value: "BR" },
    { name: "Clássicos (até 1990)", type: "era_movie", value: "1990-12-31" },
    { name: "Premiados Oscar", type: "keyword", value: "9715", style: "award" }, // Keyword ID 9715 (oscar winner)
    { name: "Divisoria", type: "divider" },
    { name: "Netflix", type: "provider", value: "8" },
    { name: "Prime Video", type: "provider", value: "9" },
    { name: "Max", type: "provider", value: "1899" },
    { name: "Paramount+", type: "provider", value: "531" },
    { name: "Globoplay", type: "provider", value: "307" },
    { name: "Disney+", type: "provider", value: "337" },
    { name: "Apple TV+", type: "provider", value: "350" },
];

// Filtros personalizados para a página de Séries (mantidos)
export const tvFilters = [
    { name: "Todos os Gêneros", type: "genre", value: "" },
    { name: "Ação e Aventura", type: "genre", value: "10759" },
    { name: "Animação", type: "genre", value: "16" },
    { name: "Comédia", type: "genre", value: "35" },
    { name: "Criminal", type: "genre", value: "80" },
    { name: "Suspense", type: "genre", value: "9648" },
    { name: "Terror", type: "genre", value: "9648" },
    { name: "Drama", type: "genre", value: "18" },
    { name: "Romance", type: "genre", value: "18" },
    { name: "Ficção-Científica e Fantasia", type: "genre", value: "10765" },
    { name: "Mistério", type: "genre", value: "9648" },
    { name: "Policial", type: "genre", value: "80" }, // Reutilizando "Criminal"
    { name: "Disney e Pixar", type: "company", value: "2|3" },
    { name: "Brasileiros", type: "country", value: "BR" },
    { name: "Clássicos (até 1990)", type: "era_tv", value: "1990-12-31" },
    { name: "Premiados Emmy", type: "keyword", value: "11961", style: "award" }, // Keyword ID 11961 (emmy award)
    { name: "Divisoria", type: "divider" },
    { name: "Netflix", type: "provider", value: "8" },
    { name: "Prime Video", type: "provider", value: "9" },
    { name: "Max", type: "provider", value: "1899" },
    { name: "Paramount+", type: "provider", value: "531" },
    { name: "Globoplay", type: "provider", value: "307" },
    { name: "Disney+", type: "provider", value: "337" },
    { name: "Apple TV+", type: "provider", value: "350" },
];

// Exporta as opções de ORDEM (Sort By) - mantido
export const sortByOptions = {
    movie: [
        { name: 'Mais Populares', value: 'popularity.desc' },
        { name: 'Melhores Avaliados', value: 'vote_average.desc' },
        { name: 'Mais Recentes', value: 'primary_release_date.desc' },
        { name: 'Ordem Alfabética (A-Z)', value: 'original_title.asc' }
    ],
    tv: [ // Usado para Séries e Animes
        { name: 'Mais Populares', value: 'popularity.desc' },
        { name: 'Melhores Avaliados', value: 'vote_average.desc' },
        { name: 'Mais Recentes', value: 'first_air_date.desc' },
        { name: 'Ordem Alfabética (A-Z)', value: 'name.asc' }
    ]
};