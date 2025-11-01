/**
 * Seleciona e exporta todos os elementos do DOM como um único objeto
 * para facilitar o acesso em toda a aplicação.
 */
export const dom = {
    // Elementos principais
    mainNav: document.getElementById('main-nav'),
    logo: document.getElementById('logo'),
    heroSection: document.getElementById('hero'),
    heroTitle: document.getElementById('hero-title'),
    heroOverview: document.getElementById('hero-overview'),
    heroPlayButton: document.getElementById('hero-play-button'),
    heroInfoButton: document.getElementById('hero-info-button'),
    contentRowsContainer: document.getElementById('content-rows'),
    searchButton: document.getElementById('search-button'),
    searchInput: document.getElementById('search-input'),
    
    // ==========================================================
    // MUDANÇA (Request 1): Adiciona o container principal
    // ==========================================================
    mainContent: document.getElementById('main-content'),

    // Links de Navegação
    mainNavigation: document.getElementById('main-navigation'), // O container <nav>
    navInicio: document.getElementById('nav-inicio'),
    navSeries: document.getElementById('nav-series'),
    navFilmes: document.getElementById('nav-filmes'),
    navAnimes: document.getElementById('nav-animes'),
    navMinhaLista: document.getElementById('nav-minha-lista'),
    navSorte: document.getElementById('nav-sorte'),

    // Modal do Player
    playerModal: document.getElementById('player-modal'),
    playerContainer: document.getElementById('player-container'),
    closePlayerButton: document.getElementById('close-player'),
    playerModalContent: document.getElementById('player-modal-content'),
    playerControlsTV: document.getElementById('player-controls-tv'),
    playerEpisodesButton: document.getElementById('player-episodes-button'),
    playerNextButton: document.getElementById('player-next-button'),

    // Elementos do painel de episódios
    playerEpisodeListPanel: document.getElementById('player-ep-list-panel'),
    playerEpListCloseButton: document.getElementById('player-ep-list-close-button'),
    playerEpListSeasonSelect: document.getElementById('player-ep-list-season-select'),
    playerEpListContainer: document.getElementById('player-ep-list-container'),


    // Modal de Detalhes
    detailsModal: document.getElementById('details-modal'),
    closeDetailsModalButton: document.getElementById('close-details-modal'),
    detailsModalBackdropImage: document.getElementById('details-modal-backdrop-image'),
    detailsModalTitle: document.getElementById('details-modal-title'),
    detailsModalRating: document.getElementById('details-modal-rating'),
    detailsModalReleaseDate: document.getElementById('details-modal-release-date'),
    detailsModalRuntime: document.getElementById('details-modal-runtime'),
    detailsModalSeasons: document.getElementById('details-modal-seasons'),
    detailsModalAgeRating: document.getElementById('details-modal-age-rating'),
    detailsModalOverview: document.getElementById('details-modal-overview'),
    detailsModalCast: document.getElementById('details-modal-cast'),
    detailsModalGenres: document.getElementById('details-modal-genres'),
    detailsModalTags: document.getElementById('details-modal-tags'),
    detailsModalPlayButton: document.getElementById('details-modal-play-button'),
    detailsModalTrailerButton: document.getElementById('details-modal-trailer-button'),
    detailsModalAddListButton: document.getElementById('details-modal-add-list-button'),
    
    seriesSeasonsContainer: document.getElementById('series-seasons-container'),
    detailsModalSeasonSelect: document.getElementById('details-modal-season-select'),
    detailsModalEpisodesList: document.getElementById('details-modal-episodes-list'),

    // Elementos da Intro
    introModal: document.getElementById('intro-modal'),
    introVideo: document.getElementById('intro-video'),
    skipIntroButton: document.getElementById('skip-intro-button'),
};