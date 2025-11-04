export const categories = {
    default: [
        { title: "Em Alta Hoje", endpoint: "/trending/all/day" },
        { title: "Últimos Assistidos", endpoint: "localstorage" }, 
        { title: "Séries Aclamadas pela Crítica", endpoint: "/tv/top_rated?vote_count.gte=1000" }, 
        { title: "Filmes de Terror", endpoint: "/discover/movie?with_genres=27" },
        { title: "Filmes Suspense", endpoint: "/discover/movie?with_genres=53" }, 
        { title: "Filmes Populares", endpoint: "/movie/popular" },
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