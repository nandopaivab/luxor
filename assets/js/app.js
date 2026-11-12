// Aplicação Completa - Imóveis Luxor
(function () {
  const DATA = window.LUXOR_DATA;
  let favorites = JSON.parse(localStorage.getItem('luxor_favs') || '[]');
  let viewMode = 'grid'; // 'grid' | 'list'
  let cardPhotoIndices = {};
  let currentGalleryPhotos = [];
  let currentGalleryIndex = 0;

  // Estado de filtros
  let currentFilters = {
    busca: '',
    finalidade: 'venda', // 'venda' | 'aluguel' | 'todos'
    negociacao: [],
    cidade: '',
    bairro: '',
    tipos: [],
    caracs: [],
    estagio: '',
    suitesMin: 0,
    vagasMin: 0,
    precoMin: null,
    precoMax: null,
    areaMin: null,
    areaMax: null,
    apenasFavoritos: false,
    corretor: ''
  };

  function saveFavorites() {
    localStorage.setItem('luxor_favs', JSON.stringify(favorites));
    updateFavBadges();
  }

  function isFav(id) {
    return favorites.includes(Number(id));
  }

  window.toggleFavorite = function (id, ev) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    const numId = Number(id);
    if (isFav(numId)) {
      favorites = favorites.filter(x => x !== numId);
    } else {
      favorites.push(numId);
    }
    saveFavorites();
    // Atualiza botões na tela
    document.querySelectorAll(`[data-fav-btn="${numId}"]`).forEach(btn => {
      btn.classList.toggle('active', isFav(numId));
      btn.title = isFav(numId) ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
    });
    if (currentFilters.apenasFavoritos) {
      renderListingPage();
    }
  };

  function updateFavBadges() {
    document.querySelectorAll('.fav-count-badge').forEach(el => {
      el.textContent = favorites.length;
    });
  }

  // Navegação de fotos dentro do card
  window.changeCardPhoto = function (imovelId, delta, ev) {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    const im = DATA.imoveis.find(x => x.id === Number(imovelId));
    if (!im || !im.fotos.length) return;
    const cur = cardPhotoIndices[imovelId] || 0;
    const next = (cur + delta + im.fotos.length) % im.fotos.length;
    cardPhotoIndices[imovelId] = next;
    document.querySelectorAll(`img[data-card-img="${imovelId}"]`).forEach(img => {
      img.src = im.fotos[next];
    });
    document.querySelectorAll(`span[data-card-count="${imovelId}"]`).forEach(sp => {
      sp.textContent = `${next + 1}/${im.fotos.length}`;
    });
  };

  // Renderiza um Card de Imóvel
  function renderPropertyCard(im, prefixId) {
    const favActive = isFav(im.id) ? 'active' : '';
    const photoIdx = cardPhotoIndices[im.id] || 0;
    const priceHtml = im.precoAnterior
      ? `<span class="valor-de">de ${im.precoAnterior}</span><span class="valor-por">por ${im.precoTexto}</span>`
      : `<span>${im.precoTexto}</span>`;

    return `
      <li class="property-card" id="${prefixId || 'im'}-ref-${im.id}">
        <div class="card-media" onclick="navigateTo('#imovel/${im.id}')">
          <img src="${im.fotos[photoIdx]}" data-card-img="${im.id}" alt="${im.titulo}" loading="lazy">
          ${im.tarja ? `<div class="tarja ${im.tarjaClass}">${im.tarja}</div>` : ''}
          ${im.fotos.length > 1 ? `
            <button type="button" class="card-photo-nav prev" onclick="changeCardPhoto(${im.id}, -1, event)" title="Foto anterior"><i class="fa fa-angle-left"></i></button>
            <button type="button" class="card-photo-nav next" onclick="changeCardPhoto(${im.id}, 1, event)" title="Próxima foto"><i class="fa fa-angle-right"></i></button>
            <span class="card-photo-count" data-card-count="${im.id}"><i class="fa fa-camera"></i> ${photoIdx + 1}/${im.fotos.length}</span>
          ` : ''}
        </div>
        <div class="card-body-wrap">
          <div class="card-middle" onclick="navigateTo('#imovel/${im.id}')">
            <div class="card-ref" title="Referência número ${im.refNum}">${im.ref}</div>
            <p class="card-cidade">
              <i class="fa fa-map-marker"></i> ${im.cidade} - <span class="bairro">${im.bairro}</span>
            </p>
            <div class="card-tipo">${im.subtitulo}</div>
            <div class="card-icones">
              ${im.dormitorios > 0 ? `<span class="dado" title="${im.dormitorios} dormitórios (${im.suites} suíte)"><em>${im.dormitorios}</em> <i class="fa fa-bed"></i></span>` : ''}
              ${im.banheiros > 0 ? `<span class="dado" title="${im.banheiros} banheiros"><em>${im.banheiros}</em> <i class="fa fa-bath"></i></span>` : ''}
              ${im.vagas > 0 ? `<span class="dado" title="${im.vagasTexto}"><em>${im.vagas}</em> <i class="fa fa-car"></i></span>` : ''}
              <span class="dado" title="Área total ${im.areaTotal}m²"><em>${im.areaTotal} m²</em> <i class="fa fa-object-group"></i></span>
            </div>
          </div>
          <div class="card-bottom">
            <div class="card-preco">${priceHtml}</div>
            <button type="button" class="btn-fav ${favActive}" data-fav-btn="${im.id}" onclick="toggleFavorite(${im.id}, event)" title="Adicionar aos favoritos" aria-label="Adicionar aos favoritos">
              <i class="fa fa-star"></i>
            </button>
          </div>
        </div>
      </li>
    `;
  }

  // Renderiza Componente de Busca Rápida
  function renderQuickSearchBox() {
    return `
      <section id="busca-rapida">
        <h3>Encontre seu Imóvel!</h3>
        <form class="quick-search-grid" onsubmit="handleQuickSearch(event)">
          <div class="quick-search-field">
            <select id="qs_tipo" aria-label="Tipo do Imóvel">
              <option value="">Todos os Imóveis</option>
              <option value="apartamento">Apartamento</option>
              <option value="terrenos">Terrenos (Todos)</option>
              <option value="terreno">↳ Terreno</option>
              <option value="terreno-condominio">↳ Terreno em Condomínio</option>
            </select>
          </div>
          <div class="quick-search-field">
            <select id="qs_valor" aria-label="Faixa de Valores">
              <option value="">Todos os Valores</option>
              <option value="0;500000">até R$500.000</option>
              <option value="500000;750000">R$500.000 ↔ R$750.000</option>
              <option value="750000;1000000">R$750.000 ↔ R$1.000.000</option>
              <option value="1000000;1500000">R$1.000.000 ↔ R$1.500.000</option>
              <option value="1500000;2000000">R$1.500.000 ↔ R$2.000.000</option>
              <option value="2000000;3000000">R$2.000.000 ↔ R$3.000.000</option>
              <option value="3000000;999999999">a partir de R$3.000.000</option>
            </select>
          </div>
          <div class="quick-search-field">
            <i class="fa fa-map-marker"></i>
            <input type="text" id="qs_localizacao" list="luxor_locais_datalist" placeholder="digite a cidade ou bairro…">
            <datalist id="luxor_locais_datalist">
              <option value="Vila Velha">
              <option value="Vitória">
              <option value="Camaçari">
              <option value="Pontal de Camburi - Vitória">
              <option value="Interlagos - Vila Velha">
              <option value="Itapuã - Vila Velha">
              <option value="Vila de Abrantes (Abrantes) - Camaçari">
            </datalist>
          </div>
          <button type="submit" class="btn-quick-search" title="Clique para buscar">
            <i class="fa fa-search"></i> Buscar
          </button>
        </form>
      </section>
    `;
  }

  window.handleQuickSearch = function (ev) {
    ev.preventDefault();
    resetFilters();
    const tipo = document.getElementById('qs_tipo').value;
    const valor = document.getElementById('qs_valor').value;
    const loc = document.getElementById('qs_localizacao').value.trim();

    if (tipo === 'terrenos') {
      currentFilters.tipos = ['terreno', 'terreno-condominio'];
    } else if (tipo) {
      currentFilters.tipos = [tipo];
    }

    if (valor) {
      const [min, max] = valor.split(';').map(Number);
      currentFilters.precoMin = min;
      currentFilters.precoMax = max;
    }

    if (loc) {
      currentFilters.busca = loc;
    }

    navigateTo('#vendas');
  };

  // Renderiza Blocos Call to Action (3 caixas inferiores)
  function renderCtaRow() {
    return `
      <div class="cta-row">
        <div class="cta-card" onclick="navigateTo('#cadastre')">
          <i class="fa fa-building-o"></i>
          <h4>Quer vender seu imóvel?</h4>
          <h5>Cadastre-se e anuncie conosco</h5>
        </div>
        <div class="cta-card" onclick="navigateTo('#contato')">
          <i class="fa fa-bullseye"></i>
          <h4>Não encontrou o que procurava?</h4>
          <h5>Entre em contato</h5>
        </div>
        <div class="cta-card" onclick="openFavoritesPage()">
          <i class="fa fa-star"></i>
          <h4>Meus imóveis Favoritos</h4>
          <h5>Lista de imóveis adicionados (<span class="fav-count-badge">${favorites.length}</span>)</h5>
        </div>
      </div>
    `;
  }

  // Renderiza Avaliação por Estrelas
  function renderStarsRating(ratingText, totalVotes) {
    return `
      <div class="stars-container">
        <div class="star-icons" onclick="voteStar(5)" title="Avaliar com 5 estrelas">
          <i class="fa fa-star"></i>
          <i class="fa fa-star"></i>
          <i class="fa fa-star"></i>
          <i class="fa fa-star"></i>
          <i class="fa fa-star"></i>
        </div>
        <span class="rating-label">
          <strong>${ratingText}</strong> / 5 (<span>${totalVotes}</span> avaliações)
        </span>
      </div>
    `;
  }

  window.voteStar = function (val) {
    alert(`Obrigado! Sua avaliação (${val} estrelas) foi registrada com sucesso para a Imóveis Luxor.`);
  };

  // ==========================================================================
  // PÁGINA HOME
  // ==========================================================================
  function renderHomePage() {
    const destaquesVenda = DATA.imoveis;
    const faixa500a1M = DATA.imoveis.filter(i => i.id === 9);
    const frenteMar = DATA.imoveis.filter(i => i.id === 9 || i.id === 5);

    const html = `
      ${renderQuickSearchBox()}

      <section>
        <h2 class="bg">
          <span>Venda - Imóveis em Destaque</span>
          <a href="#vendas" class="btn-more"><i class="fa fa-plus-circle"></i> ver todos (4)</a>
        </h2>
        <ul class="property-grid">
          ${destaquesVenda.map(im => renderPropertyCard(im, 'dest')).join('')}
        </ul>
      </section>

      <section>
        <h2 class="bg">
          <span>Entre R$500 mil e R$1 milhão</span>
          <a href="javascript:void(0)" onclick="applyQuickFilter({precoMin:500000, precoMax:1000000})" class="btn-more">
            <i class="fa fa-plus-circle"></i> de R$500 mil a R$1 milhão
          </a>
        </h2>
        <ul class="property-grid">
          ${faixa500a1M.map(im => renderPropertyCard(im, 'b1')).join('')}
        </ul>
      </section>

      <section>
        <h2 class="bg">
          <span>Imóveis Frente para o Mar</span>
          <a href="javascript:void(0)" onclick="applyQuickFilter({caracs:['frente-mar']})" class="btn-more">
            <i class="fa fa-plus-circle"></i> Frente para o Mar
          </a>
        </h2>
        <ul class="property-grid">
          ${frenteMar.map(im => renderPropertyCard(im, 'b2')).join('')}
        </ul>
      </section>

      <section>
        <h2 class="bg"><span>Buscas Populares</span></h2>
        <ul class="popular-searches-grid">
          ${DATA.buscasPopulares.map((b, idx) => `
            <li>
              <a href="javascript:void(0)" onclick="applyPopularSearch(${idx})">${b.label}</a>
              <span class="qt-badge">${b.count}</span>
            </li>
          `).join('')}
        </ul>
      </section>

      ${renderCtaRow()}

      <section id="section_newsletter">
        <h3>Receba nosso Newsletter</h3>
        <p class="sub">Cadastre-se para receber novidades por email.</p>
        <form class="newsletter-form" onsubmit="handleNewsletterSubmit(event)">
          <div class="newsletter-inputs">
            <div class="input-group-luxor">
              <input type="text" id="news_nome" required minlength="3" placeholder="nome completo…">
              <span class="addon"><i class="fa fa-user"></i></span>
            </div>
            <div class="input-group-luxor">
              <input type="email" id="news_email" required placeholder="email…">
              <span class="addon"><i class="fa fa-envelope"></i></span>
            </div>
          </div>
          <div class="newsletter-footer">
            <span><i class="fa fa-lock"></i> Ao enviar você está aceitando a <a href="#privacidade">política de privacidade</a>.</span>
            <button type="submit" class="btn-tema"><i class="fa fa-angle-double-right"></i> cadastrar</button>
          </div>
        </form>
      </section>

      ${renderStarsRating('4,8', 6)}
    `;

    document.getElementById('app-content').innerHTML = html;
    updateFavBadges();
  }

  window.handleNewsletterSubmit = function (ev) {
    ev.preventDefault();
    const nome = document.getElementById('news_nome').value;
    const email = document.getElementById('news_email').value;
    alert(`Obrigado, ${nome}! O e-mail ${email} foi cadastrado com sucesso em nossa Newsletter.`);
    ev.target.reset();
  };

  // ==========================================================================
  // PÁGINA A IMOBILIÁRIA (/imobiliaria/)
  // ==========================================================================
  function renderImobiliariaPage() {
    const c = DATA.corretor;
    const html = `
      <div class="breadcrumb-bar">
        <a href="#home">Home</a> <span class="sep">&gt;</span> <strong>A Imobiliária</strong>
      </div>

      <h2 class="bg"><span>A Imobiliária — Luxor Empreendimentos Imobiliários</span></h2>

      <div class="descricao-box" style="margin-bottom: 24px;">
        <p><strong>A Luxor Empreendimentos Imobiliários: Elevando o padrão de excelência no mercado imobiliário</strong></p>
        <p>Apresentamos com orgulho a Luxor Empreendimentos Imobiliários, uma imobiliária que se destaca no mercado ao elevar o padrão de excelência em serviços imobiliários. Com uma equipe altamente qualificada e um portfólio diversificado, estamos prontos para atender às necessidades dos nossos clientes, oferecendo soluções personalizadas e resultados excepcionais.</p>
        <p>Na Luxor, acreditamos que o lar é muito mais do que apenas um lugar para se viver. É um espaço onde memórias são construídas, sonhos são realizados e histórias ganham vida. Por isso, nos empenhamos em ajudar nossos clientes a <a href="#vendas" style="color:var(--luxor-gold);font-weight:600;text-decoration:underline;">encontrar o imóvel perfeito</a> que se encaixe em suas necessidades e desejos, seja para compra, venda ou locação.</p>
        <p>Com uma vasta experiência no mercado imobiliário, conhecemos profundamente as particularidades e tendências desse setor dinâmico. Nossos especialistas estão sempre atualizados com as últimas informações sobre o mercado, garantindo que possamos fornecer orientações precisas e estratégicas para nossos clientes.</p>
        <p>A Luxor Empreendimentos Imobiliários oferece um portfólio abrangente de imóveis de alta qualidade. Trabalhamos com uma ampla gama de propriedades, incluindo residenciais, comerciais e empreendimentos de luxo. Nossa seleção é criteriosamente escolhida, levando em consideração aspectos como localização privilegiada, arquitetura diferenciada, acabamentos de alto padrão e comodidades exclusivas.</p>
        <p>Além de ajudar nossos clientes a encontrar a propriedade ideal, também fornecemos suporte completo durante todo o processo imobiliário. Nossa equipe oferece serviços personalizados de consultoria, orientando os clientes em cada etapa, desde a avaliação de imóveis até a negociação final. Valorizamos a transparência, a ética e a integridade em todas as interações, garantindo uma experiência confiável e tranquila.</p>
        <p>Na Luxor, a satisfação dos nossos clientes é a nossa prioridade máxima. Estamos comprometidos em superar as expectativas, oferecendo um atendimento excepcional e soluções sob medida. Nosso objetivo é construir relacionamentos de longo prazo com nossos clientes, baseados na confiança e na credibilidade.</p>
        <p>Se você está em busca de uma imobiliária que entende suas necessidades, que oferece um serviço diferenciado e que valoriza a excelência, a Luxor Empreendimentos Imobiliários é a escolha certa. Venha nos conhecer e descubra como podemos ajudá-lo a encontrar o lar dos seus sonhos ou a impulsionar seus investimentos imobiliários. Estamos prontos para recebê-lo e transformar seus objetivos em realidade.</p>

        <div style="margin-top: 22px; padding-top: 16px; border-top: 1px solid #eee; display:flex; flex-wrap:wrap; gap:18px;">
          <a href="#cadastre" class="btn-tema"><i class="fa fa-dollar"></i> Cadastre seu imóvel</a>
          <a href="#contato" class="btn-tema"><i class="fa fa-comments"></i> Entre em contato</a>
          <a href="#trabalhe" class="btn-tema"><i class="fa fa-paperclip"></i> Trabalhe conosco</a>
          <a href="#mapadosite" class="btn-tema"><i class="fa fa-list"></i> Mapa de imóveis</a>
        </div>
      </div>

      ${renderStarsRating('5', 5)}

      <h2 class="bg"><span>Nosso Corretor / Equipe</span></h2>
      <div style="max-width: 440px; margin-bottom: 30px;">
        <div class="corretor-card">
          <img src="${c.foto}" alt="${c.nome}">
          <div>
            <h3>${c.nome}</h3>
            <p><i class="fa fa-id-card-o" style="color:var(--luxor-gold);"></i> <strong>${c.creci}</strong></p>
            <p><i class="fa fa-whatsapp" style="color:var(--luxor-whatsapp);"></i> <a href="https://api.whatsapp.com/send?phone=${c.whatsapp}&text=Vi%20seu%20n%C3%BAmero%20no%20site%20Im%C3%B3veis%20Luxor." target="_blank">${c.telefone}</a></p>
            <p><i class="fa fa-envelope-o" style="color:var(--luxor-gold);"></i> <a href="mailto:${c.email}">${c.email}</a></p>
            <div style="margin-top:8px;">
              <a href="#vendas" class="btn-tema" style="padding:5px 12px;font-size:12.5px;"><i class="fa fa-plus-circle"></i> ver imóveis deste corretor</a>
            </div>
          </div>
        </div>
      </div>

      ${renderQuickSearchBox()}
    `;
    document.getElementById('app-content').innerHTML = html;
  }

  // ==========================================================================
  // PÁGINA DE LISTAGEM E FILTRAGEM (VENDAS / ALUGUEL / FAVORITOS)
  // ==========================================================================
  function resetFilters() {
    currentFilters = {
      busca: '',
      finalidade: 'venda',
      negociacao: [],
      cidade: '',
      bairro: '',
      tipos: [],
      caracs: [],
      estagio: '',
      suitesMin: 0,
      vagasMin: 0,
      precoMin: null,
      precoMax: null,
      areaMin: null,
      areaMax: null,
      apenasFavoritos: false,
      corretor: ''
    };
  }

  window.applyQuickFilter = function (partial) {
    resetFilters();
    Object.assign(currentFilters, partial);
    if (partial.finalidade === 'aluguel') {
      navigateTo('#aluguel');
    } else {
      navigateTo('#vendas');
    }
    renderListingPage();
  };

  window.applyPopularSearch = function (idx) {
    const item = DATA.buscasPopulares[idx];
    if (!item) return;
    resetFilters();
    if (item.filter.finalidade) currentFilters.finalidade = item.filter.finalidade;
    if (item.filter.cidade) currentFilters.cidade = item.filter.cidade;
    if (item.filter.bairro) currentFilters.bairro = item.filter.bairro;
    if (item.filter.tipo) currentFilters.tipos = [item.filter.tipo];
    navigateTo(currentFilters.finalidade === 'aluguel' ? '#aluguel' : '#vendas');
    renderListingPage();
  };

  window.openFavoritesPage = function () {
    resetFilters();
    currentFilters.finalidade = 'todos';
    currentFilters.apenasFavoritos = true;
    navigateTo('#favoritos');
  };

  function getFilteredProperties() {
    return DATA.imoveis.filter(im => {
      if (currentFilters.apenasFavoritos && !isFav(im.id)) return false;

      if (currentFilters.finalidade && currentFilters.finalidade !== 'todos') {
        if (!im.finalidades.includes(currentFilters.finalidade)) return false;
      }

      if (currentFilters.cidade && im.cidade !== currentFilters.cidade) return false;
      if (currentFilters.bairro && im.bairro !== currentFilters.bairro) return false;

      if (currentFilters.tipos && currentFilters.tipos.length > 0) {
        if (!currentFilters.tipos.includes(im.tipo)) return false;
      }

      if (currentFilters.negociacao && currentFilters.negociacao.length > 0) {
        const hasNeg = currentFilters.negociacao.some(n => im.negociacao.includes(n));
        if (!hasNeg) return false;
      }

      if (currentFilters.caracs && currentFilters.caracs.length > 0) {
        const hasCarac = currentFilters.caracs.some(c => im.caracteristicasFiltros.includes(c));
        if (!hasCarac) return false;
      }

      if (currentFilters.estagio && im.estagio !== currentFilters.estagio) return false;

      if (currentFilters.suitesMin > 0 && im.suites < currentFilters.suitesMin) return false;
      if (currentFilters.vagasMin > 0 && im.vagas < currentFilters.vagasMin) return false;

      if (currentFilters.precoMin !== null && currentFilters.precoMin > 0) {
        if (!im.precoValor || im.precoValor < currentFilters.precoMin) return false;
      }
      if (currentFilters.precoMax !== null && currentFilters.precoMax > 0) {
        if (!im.precoValor || im.precoValor > currentFilters.precoMax) return false;
      }

      if (currentFilters.busca) {
        const q = currentFilters.busca.toLowerCase();
        const hay = `${im.ref} ${im.refNum} ${im.titulo} ${im.subtitulo} ${im.cidade} ${im.bairro} ${im.estado} ${im.caracteristicasTexto}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }

  window.setViewMode = function (mode) {
    viewMode = mode;
    renderListingPage();
  };

  window.updateFilterFromSidebar = function () {
    const buscaEl = document.getElementById('f_busca');
    if (buscaEl) currentFilters.busca = buscaEl.value.trim();

    const finEl = document.querySelector('input[name="f_finalidade"]:checked');
    if (finEl) currentFilters.finalidade = finEl.value;

    const cidEl = document.getElementById('f_cidade');
    if (cidEl) currentFilters.cidade = cidEl.value;

    currentFilters.negociacao = Array.from(document.querySelectorAll('input[name="f_neg"]:checked')).map(el => el.value);
    currentFilters.tipos = Array.from(document.querySelectorAll('input[name="f_tipo"]:checked')).map(el => el.value);
    currentFilters.caracs = Array.from(document.querySelectorAll('input[name="f_carac"]:checked')).map(el => el.value);

    const pMin = document.getElementById('f_preco_min')?.value;
    const pMax = document.getElementById('f_preco_max')?.value;
    currentFilters.precoMin = pMin ? Number(pMin.replace(/\D/g, '')) : null;
    currentFilters.precoMax = pMax ? Number(pMax.replace(/\D/g, '')) : null;

    renderListingPage();
  };

  window.clearAllFilters = function () {
    const fin = currentFilters.finalidade;
    resetFilters();
    currentFilters.finalidade = fin;
    renderListingPage();
  };

  function renderListingPage() {
    const results = getFilteredProperties();
    const titleText = currentFilters.apenasFavoritos
      ? 'Meus Imóveis Favoritos'
      : currentFilters.finalidade === 'aluguel'
        ? 'Aluguel Anual — Imóveis'
        : 'Imóveis à Venda';

    const chips = [];
    if (currentFilters.finalidade === 'venda') chips.push({ label: 'Venda', clear: () => { currentFilters.finalidade = 'todos'; renderListingPage(); } });
    if (currentFilters.finalidade === 'aluguel') chips.push({ label: 'Aluguel Anual', clear: () => { currentFilters.finalidade = 'todos'; renderListingPage(); } });
    if (currentFilters.cidade) chips.push({ label: `Cidade: ${currentFilters.cidade}`, clear: () => { currentFilters.cidade = ''; renderListingPage(); } });
    if (currentFilters.bairro) chips.push({ label: `Bairro: ${currentFilters.bairro}`, clear: () => { currentFilters.bairro = ''; renderListingPage(); } });
    if (currentFilters.busca) chips.push({ label: `Busca: "${currentFilters.busca}"`, clear: () => { currentFilters.busca = ''; renderListingPage(); } });
    if (currentFilters.tipos.length) chips.push({ label: `Tipo: ${currentFilters.tipos.join(', ')}`, clear: () => { currentFilters.tipos = []; renderListingPage(); } });
    if (currentFilters.caracs.length) chips.push({ label: `Caract.: ${currentFilters.caracs.join(', ')}`, clear: () => { currentFilters.caracs = []; renderListingPage(); } });
    if (currentFilters.precoMin || currentFilters.precoMax) {
      chips.push({ label: `Faixa de Valor selecionada`, clear: () => { currentFilters.precoMin = null; currentFilters.precoMax = null; renderListingPage(); } });
    }

    const html = `
      <div class="breadcrumb-bar">
        <a href="#home">Home</a> <span class="sep">&gt;</span> <strong>${titleText}</strong>
      </div>

      <div class="listing-layout">
        <section class="listing-main">
          <div class="results-bar">
            <div class="total-results">
              <span class="num">${results.length}</span> ${results.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
            </div>
            <div>
              <button type="button" class="btn-tema" style="padding:5px 10px;background:${viewMode === 'grid' ? 'var(--luxor-gold)' : '#1c1c1c'};color:${viewMode === 'grid' ? '#000' : '#fff'} !important;" onclick="setViewMode('grid')" title="Exibir como Galeria">
                <i class="fa fa-th-large"></i> Galeria
              </button>
              <button type="button" class="btn-tema" style="padding:5px 10px;background:${viewMode === 'list' ? 'var(--luxor-gold)' : '#1c1c1c'};color:${viewMode === 'list' ? '#000' : '#fff'} !important;" onclick="setViewMode('list')" title="Exibir como Lista">
                <i class="fa fa-th-list"></i> Lista
              </button>
            </div>
          </div>

          ${chips.length > 0 ? `
            <div class="active-filters">
              <strong style="font-size:13px;">Filtrando por:</strong>
              ${chips.map((c, i) => `<span class="filter-chip">${c.label}</span>`).join('')}
              <button type="button" class="btn-tema" style="padding:3px 9px;font-size:12px;" onclick="clearAllFilters()">Limpar filtros</button>
            </div>
          ` : ''}

          ${results.length === 0 ? `
            <div class="descricao-box" style="text-align:center;padding:40px 20px;">
              <i class="fa fa-search" style="font-size:40px;color:var(--luxor-gold);margin-bottom:12px;"></i>
              <h3>Nenhum imóvel encontrado com estes critérios</h3>
              <p style="color:#666;margin:10px 0 18px;">Tente remover alguns filtros ou entre em contato conosco para buscarmos o imóvel ideal para você.</p>
              <button type="button" class="btn-tema" onclick="clearAllFilters()">Ver todos os imóveis</button>
            </div>
          ` : `
            <ul class="property-grid cols-3 ${viewMode === 'list' ? 'list-mode' : ''}">
              ${results.map(im => renderPropertyCard(im, 'list')).join('')}
            </ul>
          `}

          ${renderStarsRating('5', 1)}
          ${renderCtaRow()}
        </section>

        <aside class="sidebar-filter-box" id="sba">
          <h2 class="bg"><span>Encontre seu Imóvel</span></h2>
          <form onsubmit="event.preventDefault(); updateFilterFromSidebar();">
            <div class="filter-group">
              <div class="input-group-luxor">
                <input type="search" id="f_busca" value="${currentFilters.busca}" placeholder="palavra-chave ou #ref…">
                <span class="addon"><i class="fa fa-search"></i></span>
              </div>
            </div>

            <div class="filter-group">
              <h4>Finalidade</h4>
              <label>
                <span class="left-check"><input type="radio" name="f_finalidade" value="venda" ${currentFilters.finalidade === 'venda' ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Venda</span>
                <span class="qt-badge">4</span>
              </label>
              <label>
                <span class="left-check"><input type="radio" name="f_finalidade" value="aluguel" ${currentFilters.finalidade === 'aluguel' ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Aluguel Anual</span>
                <span class="qt-badge">1</span>
              </label>
              <label>
                <span class="left-check"><input type="radio" name="f_finalidade" value="todos" ${currentFilters.finalidade === 'todos' ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Todos</span>
                <span class="qt-badge">4</span>
              </label>
            </div>

            <div class="filter-group">
              <h4>Negociação</h4>
              <label>
                <span class="left-check"><input type="checkbox" name="f_neg" value="com_valor_promo" ${currentFilters.negociacao.includes('com_valor_promo') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> com desconto</span>
                <span class="qt-badge">1</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_neg" value="exclusivo" ${currentFilters.negociacao.includes('exclusivo') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> exclusivo</span>
                <span class="qt-badge">3</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_neg" value="permuta" ${currentFilters.negociacao.includes('permuta') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> aceita permuta</span>
                <span class="qt-badge">1</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_neg" value="aceita_financiamento" ${currentFilters.negociacao.includes('aceita_financiamento') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> financiamento bancário</span>
                <span class="qt-badge">2</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_neg" value="aceita_veiculo" ${currentFilters.negociacao.includes('aceita_veiculo') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> aceita veículo</span>
                <span class="qt-badge">1</span>
              </label>
            </div>

            <div class="filter-group">
              <h4>Localização (Cidade)</h4>
              <div class="input-group-luxor">
                <select id="f_cidade" onchange="currentFilters.bairro=''; updateFilterFromSidebar();">
                  <option value="">Qualquer Cidade</option>
                  <option value="Vila Velha" ${currentFilters.cidade === 'Vila Velha' ? 'selected' : ''}>Vila Velha / ES (2)</option>
                  <option value="Vitória" ${currentFilters.cidade === 'Vitória' ? 'selected' : ''}>Vitória / ES (1)</option>
                  <option value="Camaçari" ${currentFilters.cidade === 'Camaçari' ? 'selected' : ''}>Camaçari / BA (1)</option>
                </select>
              </div>
            </div>

            <div class="filter-group">
              <h4>Tipo de Imóvel</h4>
              <label>
                <span class="left-check"><input type="checkbox" name="f_tipo" value="apartamento" ${currentFilters.tipos.includes('apartamento') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Apartamento</span>
                <span class="qt-badge">1</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_tipo" value="terreno" ${currentFilters.tipos.includes('terreno') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Terreno</span>
                <span class="qt-badge">2</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_tipo" value="terreno-condominio" ${currentFilters.tipos.includes('terreno-condominio') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Terreno em Condomínio</span>
                <span class="qt-badge">1</span>
              </label>
            </div>

            <div class="filter-group">
              <h4>Características</h4>
              <label>
                <span class="left-check"><input type="checkbox" name="f_carac" value="frente-mar" ${currentFilters.caracs.includes('frente-mar') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Frente para o mar</span>
                <span class="qt-badge">2</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_carac" value="diferenciado" ${currentFilters.caracs.includes('diferenciado') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Diferenciado</span>
                <span class="qt-badge">1</span>
              </label>
              <label>
                <span class="left-check"><input type="checkbox" name="f_carac" value="semimobiliado" ${currentFilters.caracs.includes('semimobiliado') ? 'checked' : ''} onchange="updateFilterFromSidebar()"> Semimobiliado</span>
                <span class="qt-badge">1</span>
              </label>
            </div>

            <div class="filter-group">
              <h4>Faixa de Preço (R$)</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="input-group-luxor">
                  <input type="number" id="f_preco_min" placeholder="Mínimo" value="${currentFilters.precoMin || ''}">
                </div>
                <div class="input-group-luxor">
                  <input type="number" id="f_preco_max" placeholder="Máximo" value="${currentFilters.precoMax || ''}">
                </div>
              </div>
            </div>

            <button type="submit" class="btn-tema" style="width:100%;justify-content:center;margin-top:10px;">
              <i class="fa fa-search"></i> Filtrar Imóveis
            </button>
          </form>
        </aside>
      </div>
    `;

    document.getElementById('app-content').innerHTML = html;
  }

  // ==========================================================================
  // PÁGINA DE DETALHE DO IMÓVEL (#imovel/:id)
  // ==========================================================================
  function renderPropertyDetailPage(id) {
    const im = DATA.imoveis.find(x => x.id === Number(id)) || DATA.imoveis[0];
    currentGalleryPhotos = im.fotos;
    currentGalleryIndex = 0;

    const c = DATA.corretor;
    const favActive = isFav(im.id);
    const whatsMsg = encodeURIComponent(`Olá, tenho interesse no imóvel: ref ${im.ref} (${im.titulo}) - ${im.cidade} / ${im.bairro}. Aguardo o contato.`);

    const html = `
      <div class="breadcrumb-bar">
        <a href="#vendas">Imóveis à Venda</a>
        <span class="sep">&gt;</span>
        <a href="javascript:void(0)" onclick="applyQuickFilter({tipos:['${im.tipo}']})">${im.tipoLabel}</a>
        <span class="sep">&gt;</span>
        <a href="javascript:void(0)" onclick="applyQuickFilter({cidade:'${im.cidade}'})">${im.cidade} (${im.uf})</a>
        <span class="sep">&gt;</span>
        <a href="javascript:void(0)" onclick="applyQuickFilter({bairro:'${im.bairro}'})">${im.bairro}</a>
        <span class="sep">&gt;</span>
        <strong>${im.titulo} (${im.ref})</strong>
      </div>

      <div class="detail-top-grid">
        <div class="gallery-wrapper">
          <div class="gallery-main">
            <button type="button" class="gallery-btn prev" onclick="stepDetailGallery(-1)" title="Foto anterior"><i class="fa fa-angle-left"></i></button>
            <img id="detail-main-img" src="${im.fotos[0]}" alt="${im.titulo}" onclick="openLightbox()">
            <button type="button" class="gallery-btn next" onclick="stepDetailGallery(1)" title="Próxima foto"><i class="fa fa-angle-right"></i></button>
            <div class="gallery-caption">
              <span id="detail-caption-txt">${im.legendasFotos[0] || im.titulo}</span>
              <span id="detail-counter-txt">Foto 1 de ${im.fotos.length} (clique para ampliar)</span>
            </div>
          </div>
          <div class="gallery-thumbs">
            ${im.fotos.map((f, idx) => `
              <img src="${f}" class="${idx === 0 ? 'active' : ''}" data-thumb-idx="${idx}" onclick="selectDetailGallery(${idx})" alt="Miniatura ${idx + 1}">
            `).join('')}
          </div>
        </div>

        <div class="imov-main-box">
          <div class="card-ref" style="font-size:13px;">Ref. ${im.ref}</div>
          <p class="cidade-header">
            <i class="fa fa-map-marker" style="color:var(--luxor-gold);"></i>
            ${im.cidade} / ${im.uf} — ${im.bairro}
          </p>

          ${im.tarja ? `<div class="tarja-detalhe ${im.tarjaClass}">${im.tarja}</div>` : ''}

          <div class="imov-specs-list">
            <p><i class="fa fa-home"></i> <strong>Tipo:</strong> ${im.subtitulo}</p>
            ${im.dormitorios > 0 ? `<p><i class="fa fa-bed"></i> ${im.dormitorios} dormitórios (${im.suites} suíte)</p>` : ''}
            ${im.vagas > 0 ? `<p><i class="fa fa-car"></i> ${im.vagasTexto}</p>` : ''}
            ${im.banheiros > 0 ? `<p><i class="fa fa-bath"></i> ${im.banheiros} banheiros</p>` : ''}
            ${im.caracteristicasTexto ? `<p><i class="fa fa-arrow-right"></i> ${im.caracteristicasTexto}</p>` : ''}
            ${im.areaPrivativa ? `<p><i class="fa fa-arrows"></i> <strong>${im.areaPrivativa} m²</strong> de área privativa</p>` : ''}
            <p><i class="fa fa-object-group"></i> <strong>${im.areaTotal} m²</strong> de área total</p>
            ${im.condominio ? `<p><i class="fa fa-building"></i> <strong>Condomínio:</strong> ${im.condominio}</p>` : ''}
            ${im.iptu ? `<p><i class="fa fa-file-text-o"></i> <strong>IPTU:</strong> ${im.iptu}</p>` : ''}
          </div>

          <div class="imov-price-box">
            ${im.precoAnterior ? `<div class="price-old">de ${im.precoAnterior}</div>` : ''}
            <div class="price-main">${im.precoAnterior ? `por ${im.precoTexto}` : im.precoTexto}</div>
            <div class="negociacao-tags">
              ${im.negociacaoLabels.map(lbl => `<span class="tag">${lbl}</span>`).join('')}
            </div>
          </div>

          <a class="btn-mais-whats" href="https://api.whatsapp.com/send?phone=${DATA.empresa.whatsappNumero}&text=${whatsMsg}" target="_blank" rel="noopener">
            <i class="fa fa-whatsapp" style="font-size:20px;"></i> Mais Informações via WhatsApp
          </a>

          <p class="aviso-preco">
            Os preços, disponibilidades e condições de pagamento poderão ser alterados sem prévia comunicação.
          </p>

          <div class="imov-actions-list">
            <button type="button" onclick="shareCurrentProperty('${im.titulo}', '${im.ref}')">
              <i class="fa fa-share-alt"></i> Compartilhar
            </button>
            <button type="button" data-fav-btn="${im.id}" class="${favActive ? 'active' : ''}" onclick="toggleFavorite(${im.id}, event)">
              <i class="fa fa-star" style="color:${favActive ? 'var(--luxor-gold)' : 'inherit'}"></i> ${favActive ? 'Favoritado' : 'Favoritar'}
            </button>
            <button type="button" onclick="window.print()">
              <i class="fa fa-print"></i> Imprimir
            </button>
            <button type="button" onclick="document.getElementById('financiamento-box').classList.toggle('hidden')">
              <i class="fa fa-dollar"></i> Financiamentos
            </button>
          </div>

          <div id="financiamento-box" class="hidden" style="margin-top:10px;background:#fff;border:1px solid #ddd;padding:10px;">
            <strong style="font-size:12.5px;display:block;margin-bottom:6px;">Simuladores de Financiamento Habitação:</strong>
            ${DATA.bancosFinanciamento.map(b => `
              <a href="${b.url}" target="_blank" rel="noopener" style="display:block;font-size:12.5px;padding:3px 0;color:#222;">
                <i class="fa fa-external-link" style="color:var(--luxor-gold);"></i> ${b.nome}
              </a>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="detail-bottom-grid">
        <div>
          ${im.youtubeEmbed ? `
            <h2 class="bg" style="margin-top:0;"><span>Vídeo do Imóvel</span></h2>
            <div class="video-container">
              <iframe src="${im.youtubeEmbed}" title="Vídeo ${im.titulo}" frameborder="0" allowfullscreen></iframe>
            </div>
          ` : ''}

          <h2 class="bg" style="margin-top:0;"><span>Descrição e Detalhes — ${im.titulo}</span></h2>
          <div class="descricao-box">
            ${im.descricaoHtml}
            ${im.bullets && im.bullets.length ? `
              <div class="caracteristicas-bullets">
                <h4 style="margin-bottom:10px;">Destaques e Características:</h4>
                <ul>
                  ${im.bullets.map(b => `<li>${b}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          ${im.coordenadas ? `
            <h2 class="bg"><span>Imediações — ${im.coordenadas.label}</span></h2>
            <div style="border:1px solid #ddd;background:#f5f5f5;padding:12px;">
              <iframe
                width="100%"
                height="340"
                frameborder="0"
                style="border:0"
                src="https://maps.google.com/maps?q=${im.coordenadas.lat},${im.coordenadas.lng}&z=15&output=embed"
                allowfullscreen>
              </iframe>
            </div>
          ` : ''}
        </div>

        <div>
          <div class="corretor-card">
            <img src="${c.foto}" alt="${c.nome}">
            <div>
              <h3>${c.nome}</h3>
              <p><i class="fa fa-whatsapp" style="color:var(--luxor-whatsapp);"></i> <a href="https://api.whatsapp.com/send?phone=${c.whatsapp}&text=${whatsMsg}" target="_blank"><strong>${c.telefone}</strong></a></p>
              <p><i class="fa fa-address-card-o" style="color:var(--luxor-gold);"></i> ${c.creci}</p>
              <a href="#vendas" class="btn-tema" style="padding:4px 10px;font-size:12px;margin-top:4px;"><i class="fa fa-plus-circle"></i> mais imóveis</a>
            </div>
          </div>

          <div class="mais-info-box">
            <h3><i class="fa fa-comments" style="color:var(--luxor-gold);"></i> Mais informações sobre este imóvel</h3>
            <form onsubmit="handleImovelContact(event, '${im.ref}', '${im.titulo}')">
              <div class="form-group-luxor">
                <label>Mensagem *</label>
                <div class="input-group-luxor">
                  <textarea id="im_msg" rows="3" required>Olá, tenho interesse no imóvel: ref ${im.ref} ${im.subtitulo} - Venda, ${im.cidade} - ${im.bairro}. Aguardo o contato. Obrigado.</textarea>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>Nome Completo *</label>
                <div class="input-group-luxor">
                  <input type="text" id="im_nome" required minlength="3" placeholder="Seu nome completo">
                  <span class="addon"><i class="fa fa-user"></i></span>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>Email *</label>
                <div class="input-group-luxor">
                  <input type="email" id="im_email" required placeholder="seu@email.com">
                  <span class="addon"><i class="fa fa-envelope"></i></span>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>Telefone / WhatsApp *</label>
                <div class="input-group-luxor">
                  <input type="tel" id="im_fone" required placeholder="(27) 99999-9999">
                  <span class="addon"><i class="fa fa-phone"></i></span>
                </div>
              </div>
              <p style="font-size:11.5px;color:#666;margin-bottom:10px;">
                <i class="fa fa-lock"></i> Ao enviar você está aceitando a <a href="#privacidade">política de privacidade</a>.
              </p>
              <button type="submit" class="btn-tema" style="width:100%;justify-content:center;">
                <i class="fa fa-angle-double-right"></i> Enviar Solicitação
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('app-content').innerHTML = html;
  }

  window.selectDetailGallery = function (idx) {
    if (!currentGalleryPhotos.length) return;
    currentGalleryIndex = (idx + currentGalleryPhotos.length) % currentGalleryPhotos.length;
    const mainImg = document.getElementById('detail-main-img');
    if (mainImg) mainImg.src = currentGalleryPhotos[currentGalleryIndex];
    const counter = document.getElementById('detail-counter-txt');
    if (counter) counter.textContent = `Foto ${currentGalleryIndex + 1} de ${currentGalleryPhotos.length} (clique para ampliar)`;
    document.querySelectorAll('[data-thumb-idx]').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.thumbIdx) === currentGalleryIndex);
    });
  };

  window.stepDetailGallery = function (delta) {
    selectDetailGallery(currentGalleryIndex + delta);
  };

  window.openLightbox = function () {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    if (modal && img && currentGalleryPhotos.length) {
      img.src = currentGalleryPhotos[currentGalleryIndex];
      modal.classList.add('open');
    }
  };

  window.closeLightbox = function () {
    document.getElementById('lightbox-modal')?.classList.remove('open');
  };

  window.shareCurrentProperty = function (titulo, ref) {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert(`Link do imóvel ${ref} (${titulo}) copiado para a área de transferência!`);
    } else {
      prompt('Copie o link deste imóvel:', url);
    }
  };

  window.handleImovelContact = function (ev, ref, titulo) {
    ev.preventDefault();
    const nome = document.getElementById('im_nome').value;
    const email = document.getElementById('im_email').value;
    const fone = document.getElementById('im_fone').value;
    const msg = document.getElementById('im_msg').value;
    const textoWhats = encodeURIComponent(`${msg}\n\nNome: ${nome}\nTelefone: ${fone}\nE-mail: ${email}`);
    window.open(`https://api.whatsapp.com/send?phone=${DATA.empresa.whatsappNumero}&text=${textoWhats}`, '_blank');
  };

  // ==========================================================================
  // PÁGINA FALE CONOSCO (#contato)
  // ==========================================================================
  function renderContatoPage() {
    const e = DATA.empresa;
    const html = `
      <div class="breadcrumb-bar">
        <a href="#home">Home</a> <span class="sep">&gt;</span> <strong>Fale Conosco</strong>
      </div>

      <h2 class="bg"><span>Fale Conosco — Entre em Contato</span></h2>

      <div class="detail-top-grid">
        <div class="descricao-box">
          <form onsubmit="handleContatoSubmit(event)">
            <div class="form-group-luxor">
              <label>Nome Completo *</label>
              <div class="input-group-luxor">
                <input type="text" id="ct_nome" required minlength="3" placeholder="Digite seu nome completo">
                <span class="addon"><i class="fa fa-user"></i></span>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div class="form-group-luxor">
                <label>Email *</label>
                <div class="input-group-luxor">
                  <input type="email" id="ct_email" required placeholder="seu@email.com">
                  <span class="addon"><i class="fa fa-envelope"></i></span>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>Telefone / WhatsApp</label>
                <div class="input-group-luxor">
                  <input type="tel" id="ct_fone" placeholder="(27) 99999-9999">
                  <span class="addon"><i class="fa fa-phone"></i></span>
                </div>
              </div>
            </div>
            <div class="form-group-luxor">
              <label>Mensagem *</label>
              <div class="input-group-luxor">
                <textarea id="ct_msg" rows="5" required placeholder="Digite sua mensagem..."></textarea>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:12px;">
              <span style="font-size:12.5px;color:#666;">
                * campos obrigatórios. <i class="fa fa-lock"></i> Ao enviar você está aceitando a <a href="#privacidade">política de privacidade</a>.
              </span>
              <button type="submit" class="btn-tema"><i class="fa fa-envelope"></i> enviar</button>
            </div>
          </form>
        </div>

        <div class="imov-main-box">
          <h3 style="font-size:20px;margin-bottom:12px;border-bottom:2px solid var(--luxor-gold);padding-bottom:6px;">${e.nome}</h3>
          <p style="margin-bottom:8px;"><i class="fa fa-flag" style="color:var(--luxor-gold);width:20px;"></i> <strong>${e.cidade} / ${e.uf}</strong> (${e.creci})</p>
          <p style="margin-bottom:8px;">
            <i class="fa fa-whatsapp" style="color:var(--luxor-whatsapp);width:20px;"></i>
            <a href="https://api.whatsapp.com/send?phone=${e.whatsappNumero}" target="_blank"><strong>${e.telefoneExibicao} (WhatsApp)</strong></a>
          </p>
          <p style="margin-bottom:8px;">
            <i class="fa fa-envelope" style="color:var(--luxor-gold);width:20px;"></i>
            <a href="mailto:${e.email}">${e.email}</a>
          </p>
          <hr style="border:0;border-top:1px solid #e0d8c8;margin:14px 0;">
          <p style="margin-bottom:8px;"><i class="fa fa-paperclip" style="color:var(--luxor-gold);width:20px;"></i> <a href="#trabalhe">Trabalhe conosco</a></p>
          <p style="margin-bottom:8px;"><i class="fa fa-dollar" style="color:var(--luxor-gold);width:20px;"></i> <a href="#cadastre">Cadastre seu imóvel</a></p>
          <p style="margin-bottom:8px;"><i class="fa fa-instagram" style="color:var(--luxor-gold);width:20px;"></i> <a href="${e.instagram}" target="_blank">@imoveisluxorbr</a></p>
          <p style="margin-bottom:8px;"><i class="fa fa-youtube-play" style="color:var(--luxor-gold);width:20px;"></i> <a href="${e.youtube}" target="_blank">YouTube Imóveis Luxor</a></p>
        </div>
      </div>
    `;
    document.getElementById('app-content').innerHTML = html;
  }

  window.handleContatoSubmit = function (ev) {
    ev.preventDefault();
    const nome = document.getElementById('ct_nome').value;
    const email = document.getElementById('ct_email').value;
    const fone = document.getElementById('ct_fone').value;
    const msg = document.getElementById('ct_msg').value;
    const texto = encodeURIComponent(`Contato pelo site Imóveis Luxor:\nNome: ${nome}\nE-mail: ${email}\nTelefone: ${fone}\nMensagem: ${msg}`);
    window.open(`https://api.whatsapp.com/send?phone=${DATA.empresa.whatsappNumero}&text=${texto}`, '_blank');
  };

  // ==========================================================================
  // PÁGINA CADASTRE SEU IMÓVEL (#cadastre)
  // ==========================================================================
  function renderCadastrePage() {
    const html = `
      <div class="breadcrumb-bar">
        <a href="#home">Home</a> <span class="sep">&gt;</span> <strong>Venda ou Alugue seu Imóvel</strong>
      </div>

      <h2 class="bg"><span>Cadastre seu Imóvel — Venda ou Alugue Conosco</span></h2>

      <div class="detail-top-grid" style="grid-template-columns: 1fr 2.5fr;">
        <aside class="imov-main-box">
          <h3 style="margin-bottom:10px;">Anuncie na Imóveis Luxor</h3>
          <p style="margin-bottom:12px;">Para você que é proprietário de imóvel e deseja vender, alugar ou permutar: <strong>Imóveis Luxor</strong> ajuda você a fazer o melhor negócio.</p>
          <p>Preencha o formulário com dados do seu imóvel e seus dados pessoais. Entraremos em contato assim que possível para tratar dos detalhes.</p>
        </aside>

        <div class="descricao-box">
          <form onsubmit="handleCadastreSubmit(event)">
            <h3 style="border-bottom:2px solid var(--luxor-gold);padding-bottom:6px;margin-bottom:14px;">Seu Imóvel</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div class="form-group-luxor">
                <label>Objetivo *</label>
                <div class="input-group-luxor">
                  <select id="cad_objetivo" required>
                    <option value="">deseja...</option>
                    <option value="vender">vender</option>
                    <option value="alugar">alugar</option>
                    <option value="alugar para temporada">alugar para temporada</option>
                    <option value="alugar para estudantes">alugar para estudantes</option>
                  </select>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>Tipo de Imóvel *</label>
                <div class="input-group-luxor">
                  <select id="cad_tipo" required>
                    <option value="">selecione...</option>
                    <optgroup label="Apartamento">
                      <option>Apartamento</option>
                      <option>Apartamento Duplex</option>
                      <option>Apartamento Garden</option>
                      <option>Cobertura</option>
                      <option>Flat / Studio / Kitnet / Loft</option>
                    </optgroup>
                    <optgroup label="Casa">
                      <option>Casa</option>
                      <option>Casa em Condomínio</option>
                      <option>Sobrado</option>
                    </optgroup>
                    <optgroup label="Terreno">
                      <option>Terreno</option>
                      <option>Terreno Comercial</option>
                      <option>Terreno em Condomínio</option>
                      <option>Terreno em Loteamento</option>
                    </optgroup>
                    <optgroup label="Propriedade Rural">
                      <option>Chácara / Fazenda / Sítio / Haras</option>
                    </optgroup>
                    <optgroup label="Imóvel Comercial">
                      <option>Sala Comercial / Loja / Galpão / Prédio</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>Número de Quartos</label>
                <div class="input-group-luxor"><input type="text" id="cad_quartos"></div>
              </div>
              <div class="form-group-luxor">
                <label>Área Útil (m²)</label>
                <div class="input-group-luxor"><input type="text" id="cad_area"></div>
              </div>
              <div class="form-group-luxor">
                <label>Cidade do Imóvel</label>
                <div class="input-group-luxor"><input type="text" id="cad_cidade_imovel"></div>
              </div>
              <div class="form-group-luxor">
                <label>Bairro do Imóvel</label>
                <div class="input-group-luxor"><input type="text" id="cad_bairro_imovel"></div>
              </div>
              <div class="form-group-luxor">
                <label>Endereço do Imóvel</label>
                <div class="input-group-luxor"><input type="text" id="cad_endereco_imovel"></div>
              </div>
              <div class="form-group-luxor">
                <label>Valor Desejado (R$) *</label>
                <div class="input-group-luxor"><input type="text" id="cad_valor" required></div>
              </div>
            </div>

            <h3 style="border-bottom:2px solid var(--luxor-gold);padding-bottom:6px;margin:20px 0 14px;">Seus Dados</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div class="form-group-luxor">
                <label>Nome Completo *</label>
                <div class="input-group-luxor"><input type="text" id="cad_nome" required></div>
              </div>
              <div class="form-group-luxor">
                <label>Telefone / WhatsApp *</label>
                <div class="input-group-luxor"><input type="tel" id="cad_fone" required></div>
              </div>
              <div class="form-group-luxor">
                <label>Email *</label>
                <div class="input-group-luxor"><input type="email" id="cad_email" required></div>
              </div>
              <div class="form-group-luxor">
                <label>Cidade / UF</label>
                <div class="input-group-luxor"><input type="text" id="cad_cidade_prop" value="Vitória / ES"></div>
              </div>
            </div>
            <div class="form-group-luxor">
              <label>Observações</label>
              <div class="input-group-luxor"><textarea id="cad_obs" rows="3"></textarea></div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-top:14px;">
              <span style="font-size:12.5px;color:#666;">* campos obrigatórios. Ao enviar você aceita a <a href="#privacidade">política de privacidade</a>.</span>
              <button type="submit" class="btn-tema"><i class="fa fa-angle-double-right"></i> cadastrar imóvel</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.getElementById('app-content').innerHTML = html;
  }

  window.handleCadastreSubmit = function (ev) {
    ev.preventDefault();
    const obj = document.getElementById('cad_objetivo').value;
    const tipo = document.getElementById('cad_tipo').value;
    const cid = document.getElementById('cad_cidade_imovel').value;
    const bai = document.getElementById('cad_bairro_imovel').value;
    const val = document.getElementById('cad_valor').value;
    const nome = document.getElementById('cad_nome').value;
    const fone = document.getElementById('cad_fone').value;
    const texto = encodeURIComponent(`Olá! Quero cadastrar meu imóvel na Imóveis Luxor:\nObjetivo: ${obj}\nTipo: ${tipo}\nLocal: ${cid} - ${bai}\nValor pretendido: R$ ${val}\nProprietário: ${nome} (${fone})`);
    window.open(`https://api.whatsapp.com/send?phone=${DATA.empresa.whatsappNumero}&text=${texto}`, '_blank');
  };

  // ==========================================================================
  // PÁGINA TRABALHE CONOSCO (#trabalhe)
  // ==========================================================================
  function renderTrabalhePage() {
    const html = `
      <div class="breadcrumb-bar">
        <a href="#home">Home</a> <span class="sep">&gt;</span> <strong>Trabalhe Conosco</strong>
      </div>

      <h2 class="bg"><span>Trabalhe Conosco — Envie seu Currículo</span></h2>

      <div class="detail-top-grid" style="grid-template-columns: 1fr 2.5fr;">
        <aside class="imov-main-box">
          <p>Preencha o formulário, envie e aguarde. A <strong>Imóveis Luxor</strong> irá entrar em contato caso haja seleção para a vaga desejada.</p>
        </aside>
        <div class="descricao-box">
          <form onsubmit="event.preventDefault(); alert('Currículo enviado com sucesso para a Imóveis Luxor! Entraremos em contato.'); event.target.reset();">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div class="form-group-luxor">
                <label>Nome Completo *</label>
                <div class="input-group-luxor"><input type="text" required></div>
              </div>
              <div class="form-group-luxor">
                <label>Cargo de Interesse *</label>
                <div class="input-group-luxor"><input type="text" required placeholder="Ex: Corretor de Imóveis"></div>
              </div>
              <div class="form-group-luxor">
                <label>Sexo *</label>
                <div class="input-group-luxor">
                  <select required><option value="">selecione...</option><option>Masculino</option><option>Feminino</option></select>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>Estado Civil *</label>
                <div class="input-group-luxor">
                  <select required><option value="">selecione...</option><option>Solteiro(a)</option><option>Casado(a)</option><option>Separado(a)</option><option>Viúvo(a)</option></select>
                </div>
              </div>
              <div class="form-group-luxor">
                <label>CPF *</label>
                <div class="input-group-luxor"><input type="text" required placeholder="000.000.000-00"></div>
              </div>
              <div class="form-group-luxor">
                <label>Telefone / WhatsApp *</label>
                <div class="input-group-luxor"><input type="tel" required placeholder="(27) 99999-9999"></div>
              </div>
              <div class="form-group-luxor">
                <label>Email</label>
                <div class="input-group-luxor"><input type="email"></div>
              </div>
              <div class="form-group-luxor">
                <label>Cidade / Estado</label>
                <div class="input-group-luxor"><input type="text" placeholder="Vitória / ES"></div>
              </div>
            </div>
            <div class="form-group-luxor">
              <label>Experiência Profissional</label>
              <div class="input-group-luxor"><textarea rows="4"></textarea></div>
            </div>
            <button type="submit" class="btn-tema"><i class="fa fa-angle-double-right"></i> cadastrar currículo</button>
          </form>
        </div>
      </div>
    `;
    document.getElementById('app-content').innerHTML = html;
  }

  // ==========================================================================
  // PÁGINA MAPA DE IMÓVEIS (#mapadosite) E POLÍTICA DE PRIVACIDADE (#privacidade)
  // ==========================================================================
  function renderMapaDoSitePage() {
    const html = `
      <div class="breadcrumb-bar">
        <a href="#home">Home</a> <span class="sep">&gt;</span> <strong>Mapa de Imóveis</strong>
      </div>

      <h2 class="bg"><span>Mapa de Imóveis — Imóveis à Venda</span></h2>
      <div class="descricao-box" style="margin-bottom:24px;">
        <div class="popular-searches-grid">
          <div>
            <h3 style="margin-bottom:10px;border-bottom:2px solid var(--luxor-gold);padding-bottom:4px;">Cidades</h3>
            <ul class="popular-searches-grid" style="grid-template-columns:1fr;">
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', cidade:'Camaçari'})">Camaçari</a> <span class="qt-badge">1</span></li>
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', cidade:'Vila Velha'})">Vila Velha</a> <span class="qt-badge">2</span></li>
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', cidade:'Vitória'})">Vitória</a> <span class="qt-badge">1</span></li>
            </ul>
          </div>
          <div>
            <h3 style="margin-bottom:10px;border-bottom:2px solid var(--luxor-gold);padding-bottom:4px;">Tipos</h3>
            <ul class="popular-searches-grid" style="grid-template-columns:1fr;">
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', tipos:['apartamento']})">Apartamento</a> <span class="qt-badge">1</span></li>
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', tipos:['terreno']})">Terreno</a> <span class="qt-badge">2</span></li>
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', tipos:['terreno-condominio']})">Terreno em Condomínio</a> <span class="qt-badge">1</span></li>
            </ul>
          </div>
          <div>
            <h3 style="margin-bottom:10px;border-bottom:2px solid var(--luxor-gold);padding-bottom:4px;">Cidades / Bairros</h3>
            <ul class="popular-searches-grid" style="grid-template-columns:1fr;">
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', bairro:'Vila de Abrantes (Abrantes)'})">Camaçari • Vila de Abrantes (Abrantes)</a> <span class="qt-badge">1</span></li>
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', bairro:'Interlagos'})">Vila Velha • Interlagos</a> <span class="qt-badge">1</span></li>
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', bairro:'Itapuã'})">Vila Velha • Itapuã</a> <span class="qt-badge">1</span></li>
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'venda', bairro:'Pontal de Camburi'})">Vitória • Pontal de Camburi</a> <span class="qt-badge">1</span></li>
            </ul>
          </div>
          <div>
            <h3 style="margin-bottom:10px;border-bottom:2px solid var(--luxor-gold);padding-bottom:4px;">Aluguel Anual</h3>
            <ul class="popular-searches-grid" style="grid-template-columns:1fr;">
              <li><a href="javascript:void(0)" onclick="applyQuickFilter({finalidade:'aluguel', cidade:'Vitória'})">Vitória • Pontal de Camburi (Terreno)</a> <span class="qt-badge">1</span></li>
            </ul>
          </div>
        </div>
      </div>
    `;
    document.getElementById('app-content').innerHTML = html;
  }

  function renderPrivacidadePage() {
    const html = `
      <div class="breadcrumb-bar">
        <a href="#home">Home</a> <span class="sep">&gt;</span> <strong>Política de Privacidade</strong>
      </div>

      <h2 class="bg"><span>Política de Privacidade — Imóveis Luxor</span></h2>
      <div class="descricao-box">
        <p>Todas as suas informações pessoais recolhidas serão usadas para o ajudar a tornar a sua visita no nosso site a mais produtiva e agradável possível.</p>
        <p>A garantia da confidencialidade dos dados pessoais dos usuários do nosso site é importante para Imóveis Luxor.</p>
        <p>Todas as informações pessoais relativas a clientes ou visitantes que usem o site Imóveis Luxor serão tratadas em concordância com a Lei da Proteção de Dados Pessoais (Lei nº 13.709/2018).</p>
        <p>A informação pessoal recolhida pode incluir o seu nome, e-mail, número de telefone e/ou telefone celular, endereço, data de nascimento e outros dados relevantes.</p>
        <p>O uso do site Imóveis Luxor pressupõe a aceitação deste Acordo de Privacidade. A equipe Imóveis Luxor reserva-se ao direito de alterar este acordo sem aviso prévio. Deste modo, recomendamos que consulte a nossa política de privacidade com regularidade de forma a estar sempre atualizado.</p>
        <h3 style="margin:16px 0 8px;">Os anúncios</h3>
        <p>Tal como outros websites, coletamos e utilizamos informação contida nos anúncios. A informação contida nos anúncios, inclui o seu endereço IP (Internet Protocol), o seu ISP (Internet Service Provider), o navegador que utilizou ao visitar o nosso website (como o Chrome ou Firefox), o tempo da sua visita e que páginas visitou dentro do nosso website.</p>
        <h3 style="margin:16px 0 8px;">Os Cookies e Web Beacons</h3>
        <p>Utilizamos cookies para armazenar informação, tais como as suas preferências pessoais quando visita o nosso website. Isto poderá incluir um simples pop-up, ou uma ligação em vários serviços que providenciamos, tais como Facebook e Instagram.</p>
        <h3 style="margin:16px 0 8px;">Contato</h3>
        <p>Se você tiver alguma dúvida sobre a política de privacidade do site Imóveis Luxor, as bases legais para coleta, tratamento e armazenamento, os dados que mantemos sobre você ou se você gostaria de exercer um dos seus direitos de proteção de dados, não hesite em nos contactar. Envie um e-mail para: <a href="mailto:contato@imoveisluxor.com.br" style="color:var(--luxor-gold);font-weight:600;">contato@imoveisluxor.com.br</a></p>
        <h3 style="margin:16px 0 8px;">Mediação e Foro</h3>
        <p>Esta política está sujeita à Lei da República Federativa do Brasil e o Foro da Comarca de Vitória / ES é competente para dirimir qualquer controvérsia com relação à mesma.</p>
      </div>
    `;
    document.getElementById('app-content').innerHTML = html;
  }

  // ==========================================================================
  // ROTEAMENTO
  // ==========================================================================
  window.navigateTo = function (hash) {
    window.location.hash = hash;
  };

  function handleRoute() {
    const hash = window.location.hash || '#home';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Fecha menu mobile se aberto
    document.getElementById('main-nav-list')?.classList.remove('mobile-open');

    // Atualiza aba ativa
    document.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));

    if (hash.startsWith('#imovel/')) {
      const id = hash.split('/')[1];
      renderPropertyDetailPage(id);
    } else if (hash === '#imobiliaria') {
      document.getElementById('nav-imobiliaria')?.classList.add('active');
      renderImobiliariaPage();
    } else if (hash === '#vendas') {
      document.getElementById('nav-vendas')?.classList.add('active');
      currentFilters.apenasFavoritos = false;
      if (currentFilters.finalidade === 'aluguel') currentFilters.finalidade = 'venda';
      renderListingPage();
    } else if (hash === '#aluguel') {
      document.getElementById('nav-aluguel')?.classList.add('active');
      resetFilters();
      currentFilters.finalidade = 'aluguel';
      renderListingPage();
    } else if (hash === '#favoritos') {
      currentFilters.apenasFavoritos = true;
      currentFilters.finalidade = 'todos';
      renderListingPage();
    } else if (hash === '#contato') {
      document.getElementById('nav-contato')?.classList.add('active');
      renderContatoPage();
    } else if (hash === '#cadastre') {
      renderCadastrePage();
    } else if (hash === '#trabalhe') {
      renderTrabalhePage();
    } else if (hash === '#mapadosite') {
      renderMapaDoSitePage();
    } else if (hash === '#privacidade') {
      renderPrivacidadePage();
    } else {
      document.getElementById('nav-home')?.classList.add('active');
      renderHomePage();
    }
    updateFavBadges();
  }

  // WhatsApp Chat Box
  window.toggleWhatsAppChat = function () {
    document.getElementById('box-whatsapp-chat')?.classList.toggle('open');
  };

  window.sendWhatsAppChatForm = function (ev) {
    ev.preventDefault();
    const msg = document.getElementById('wa_chat_msg').value;
    const nome = document.getElementById('wa_chat_nome').value;
    const fone = document.getElementById('wa_chat_fone').value;
    const texto = encodeURIComponent(`${msg}\n\nNome: ${nome}\nTelefone: ${fone}`);
    window.open(`https://api.whatsapp.com/send?phone=${DATA.empresa.whatsappNumero}&text=${texto}`, '_blank');
  };

  window.acceptLgpd = function () {
    localStorage.setItem('luxor_lgpd_ok', '1');
    document.getElementById('lgpd-banner')?.classList.add('hidden');
  };

  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('luxor_lgpd_ok') === '1') {
      document.getElementById('lgpd-banner')?.classList.add('hidden');
    }
    handleRoute();
  });
})();
